import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  fetchCatalog,
  fetchSpend,
  mergeCatalog,
  dshModelFields,
  mergeProvider,
  normalizeBaseUrl,
  parseGatewayMcp,
  parseSkillHub,
  parseSpendLogs,
  presentModel,
  providerSnippet,
  toGatewayServer,
} from '../lib/litellm.js'
import {
  createSupervisor,
  denyReason,
  loadMcpPlugin,
  mcpClientUrl,
  normalizeServer,
  probeServer,
} from '../lib/mcp.js'
import { inject } from '../lib/index.js'
import { handle } from '../lib/routes.js'
import { applyUpdate, compareVersions, findProfile, releaseStatus } from '../lib/release.js'
import {
  assertCanInstall,
  dshSkillIssue,
  findGitRoot,
  gitCloneArgs,
  installHttpSkill,
  listSkillDirs,
  parseFrontmatter,
  scanSkills,
  setSkillEnabled,
} from '../lib/skills.js'
import { attributeSpend, observeModelCall, skillNameFromArgs } from '../lib/spend.js'
import { createStore, normalizeState, publishKey } from '../lib/store.js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

test('base URL rejects secrets and trailing slashes', () => {
  assert.equal(normalizeBaseUrl('http://127.0.0.1:4000/'), 'http://127.0.0.1:4000')
  assert.throws(() => normalizeBaseUrl('http://user:pw@127.0.0.1:4000'), /密钥/)
  assert.throws(() => normalizeBaseUrl('file:///tmp/x'), /http/)
})

test('catalog merges gateway list with prices', () => {
  const catalog = mergeCatalog(
    { data: [{ id: 'alpha' }, { id: 'beta' }] },
    { data: [{ model_name: 'beta', model_info: { max_input_tokens: 8000, input_cost_per_token: 0.000001 } }] },
  )
  assert.deepEqual(catalog.map(row => row.id), ['alpha', 'beta'])
  assert.equal(catalog[1].contextWindow, 8000)
  assert.equal(catalog[1].inputCostPerToken, 0.000001)
  const detailed = mergeCatalog(
    { data: [{ id: 'deepseek-v4.1-flash' }] },
    { data: [{
      model_name: 'deepseek-v4.1-flash',
      model_info: {
        supports_vision: true,
        max_input_tokens: 1000000,
        max_output_tokens: 128000,
        supports_function_calling: true,
        api_key: 'sk-should-not-appear',
      },
      litellm_params: {
        model: 'deepseek/deepseek-v4.1-flash',
        custom_llm_provider: 'deepseek',
        litellm_credential_name: 'secret-cred',
        api_key: 'sk-nope',
      },
    }] },
  )
  assert.equal(detailed[0].supportsVision, true)
  assert.deepEqual(detailed[0].input, ['text', 'image'])
  const keys = detailed[0].attributes.map(row => row.key)
  assert.ok(keys.includes('supports_vision'))
  assert.ok(keys.includes('litellm_params.model'))
  assert.ok(keys.includes('litellm_params.custom_llm_provider'))
  assert.equal(JSON.stringify(detailed).includes('sk-should-not-appear'), false)
  assert.equal(JSON.stringify(detailed).includes('secret-cred'), false)
  assert.equal(JSON.stringify(detailed).includes('sk-nope'), false)
})

test('fetchCatalog reads both endpoints', async () => {
  const seen = []
  const fetchImpl = async (url) => {
    seen.push(url)
    if (url.endsWith('/model/info')) {
      return jsonResponse(200, { data: [{ model_name: 'm', model_info: { input_cost_per_token: 1 } }] })
    }
    return jsonResponse(200, { data: [{ id: 'm' }] })
  }
  const catalog = await fetchCatalog('http://127.0.0.1:4000', 'sk-test', fetchImpl)
  assert.equal(catalog[0].id, 'm')
  assert.equal(catalog[0].inputCostPerToken, 1)
  assert.ok(seen[0].endsWith('/v1/models'))
})

test('provider merge keeps other providers and checked model settings', () => {
  const next = mergeProvider(
    { providers: { deepseek: { api: 'openai-completions' }, litellm: { apiKeyEnv: 'LITELLM_MASTER_KEY', models: [{ id: 'old', contextWindow: 3 }] } } },
    {},
    { providerId: 'litellm', baseUrl: 'http://127.0.0.1:4000', modelIds: ['old', 'new'] },
  )
  assert.equal(next.providers.deepseek.api, 'openai-completions')
  assert.equal(next.providers.litellm.baseURL, 'http://127.0.0.1:4000')
  assert.equal(next.providers.litellm.apiKeyEnv, 'DSH_LITELLM_KEY')
  assert.equal(next.providers.litellm.displayName, 'LiteLLM')
  assert.equal(next.providers.litellm.models[0].contextWindow, 3)
  assert.deepEqual(next.providers.litellm.models[1], { id: 'new' })
  const removed = mergeProvider(
    { providers: { deepseek: { api: 'openai-completions' }, litellm: { models: [{ id: 'old' }] } } },
    {},
    { providerId: 'litellm', baseUrl: 'http://127.0.0.1:4000', modelIds: [] },
  )
  assert.equal(removed.providers.litellm, undefined)
  assert.equal(removed.providers.deepseek.api, 'openai-completions')
  const sized = mergeProvider({}, {}, {
    providerId: 'litellm',
    baseUrl: 'http://127.0.0.1:4000',
    modelIds: ['m'],
    models: [{ id: 'm', contextWindow: 1000000 }],
  })
  assert.equal(sized.providers.litellm.models[0].contextWindow, 1000000)
  assert.equal(sized.providers.litellm.models[0].input, undefined)
  assert.equal(sized.providers.litellm.models[0].reasoningEfforts, undefined)
  assert.match(providerSnippet({ providerId: 'litellm', baseUrl: 'http://127.0.0.1:4000', modelIds: ['a b'] }), /"a b"/)
  assert.match(providerSnippet({ providerId: 'litellm', baseUrl: 'http://127.0.0.1:4000', modelIds: ['m'] }), /displayName: LiteLLM/)
})

test('model profile copies only the fields LiteLLM set', () => {
  const plain = dshModelFields('deepseek-v4.1-flash', {
    max_input_tokens: 1000000,
    max_output_tokens: 32000,
    max_tokens: 1000000,
  })
  assert.equal(plain.contextWindow, 1000000)
  assert.equal(plain.maxTokens, 32000)
  assert.equal(plain.thinkingFormat, null)
  assert.equal(plain.reasoningEfforts, null)
  assert.equal(plain.input, null)
  const leveled = dshModelFields('glm-5.3-flash', {
    reasoning_effort_levels: ['high', 'max'],
    default_reasoning_effort: 'high',
    supports_vision: false,
  })
  assert.deepEqual(leveled.reasoningEfforts, { high: 'high', max: 'max' })
  assert.equal(leveled.defaultReasoningEffort, 'high')
  assert.deepEqual(leveled.input, ['text'])
  assert.equal(leveled.thinkingFormat, null)
  assert.deepEqual(dshModelFields('m', {
    supports_none_reasoning_effort: true,
    supports_max_reasoning_effort: true,
    supports_low_reasoning_effort: false,
  }).reasoningEfforts, { off: 'none', max: 'max' })
  assert.equal(dshModelFields('plain', { supports_reasoning: false }).reasoningEfforts, false)
  assert.deepEqual(dshModelFields('plain', { supports_vision: true }).input, ['text', 'image'])
  assert.deepEqual(dshModelFields('plain', { input: ['text', 'image'] }).input, ['text', 'image'])
  assert.deepEqual(dshModelFields('plain', { supports_vision: false, input: ['text', 'image'] }).input, ['text'])
  const stored = presentModel({
    id: 'deepseek-v4.1-flash',
    contextWindow: 1000000,
    maxTokens: 128000,
    input: ['text', 'image'],
    reasoningSource: 'gateway',
    reasoningEfforts: { low: 'low', high: 'high', max: 'max' },
  })
  assert.deepEqual(stored.input, ['text', 'image'])
  assert.deepEqual(stored.reasoningEfforts, { low: 'low', high: 'high', max: 'max' })
  assert.equal(dshModelFields('deepseek-v4.1-flash', {
    reasoningSource: 'inferred',
    reasoningEfforts: { off: null, high: 'high', max: 'max' },
    thinkingFormat: 'deepseek',
    contextWindow: 1000000,
  }).reasoningEfforts, null)
  const written = mergeProvider(
    {},
    { providers: { litellm: { models: [{ id: 'deepseek-v4.1-flash', reasoningEfforts: { high: 'high' }, compat: { thinkingFormat: 'deepseek' }, contextWindow: 1 }] } } },
    {
      providerId: 'litellm',
      baseUrl: 'http://127.0.0.1:4000',
      modelIds: ['deepseek-v4.1-flash'],
      models: [presentModel({ id: 'deepseek-v4.1-flash', max_input_tokens: 1000000, max_output_tokens: 32000, max_tokens: 1000000 })],
    },
  )
  const model = written.providers.litellm.models[0]
  assert.equal(model.contextWindow, 1000000)
  assert.equal(model.maxTokens, 32000)
  assert.equal(model.reasoningEfforts, undefined)
  assert.equal(model.compat, undefined)
  assert.equal(written.providers.litellm.compat.thinkingFormat, undefined)
  const yaml = providerSnippet({
    providerId: 'litellm',
    baseUrl: 'http://127.0.0.1:4000',
    modelIds: ['glm-5.3-flash'],
    models: [{ id: 'glm-5.3-flash', ...leveled }],
  })
  assert.doesNotMatch(yaml, /thinkingFormat/)
  assert.match(yaml, /high: high/)
  assert.match(providerSnippet({
    providerId: 'litellm',
    baseUrl: 'http://127.0.0.1:4000',
    modelIds: ['deepseek-v4.1-flash'],
    models: [{ id: 'deepseek-v4.1-flash', ...plain }],
  }), /maxTokens: 32000/)
  const gateway = toGatewayServer({
    server_name: 'tavily',
    auth_type: 'bearer_token',
    transport: 'http',
    description: 'search',
  }, 'http://127.0.0.1:4000')
  assert.equal(gateway.needsCredential, true)
  assert.equal(gateway.url, 'http://127.0.0.1:4000/tavily/mcp')
})

test('spend rows and skill attribution', () => {
  const logs = parseSpendLogs({
    data: [{
      request_id: 'req-1',
      model: 'alpha',
      spend: 0.02,
      total_tokens: 40,
      startTime: '2026-10-31T01:00:00.000Z',
      metadata: { session_id: 'session-12345678' },
    }],
  })
  const traces = [{
    at: '2026-10-31T01:00:02.000Z',
    sessionId: 'session-12345678',
    model: 'alpha',
  }]
  const marks = [{ kind: 'skill', skill: 'weekly', sessionId: 'session-12345678', at: '2026-10-31T00:59:00.000Z' }]
  const joined = attributeSpend(logs, traces, marks)
  assert.equal(joined.rows[0].match, 'session')
  assert.equal(joined.rows[0].skill, 'weekly')
  assert.equal(joined.summary.spend, 0.02)
  assert.equal(joined.summary.bySkill[0].key, 'weekly')
  assert.equal(skillNameFromArgs({ skill: 'weekly' }), 'weekly')
  assert.equal(observeModelCall({ model: 'alpha', sessionId: 's' }).model, 'alpha')
})

test('spend query is this key and covers the whole end day', async () => {
  let seen = ''
  const logs = await fetchSpend('http://127.0.0.1:4000', 'sk-user', { start: '2026-10-31', end: '2026-10-31' }, async (url) => {
    seen = url
    return jsonResponse(200, [])
  })
  assert.equal(logs.length, 0)
  const parsed = new URL(seen)
  assert.equal(parsed.searchParams.get('api_key'), createHash('sha256').update('sk-user').digest('hex'))
  assert.equal(seen.includes('sk-user'), false)
  assert.equal(parsed.searchParams.get('start_date'), '2026-10-31')
  assert.equal(parsed.searchParams.get('end_date'), '2026-11-01')
  await assert.rejects(
    fetchSpend('http://127.0.0.1:4000', 'sk-user', {}, async () => jsonResponse(403, { detail: "Only allowed to call routes: ['llm_api_routes']" })),
    /spend_tracking_routes/,
  )
})

test('tool guard only denies the named server tool', () => {
  const servers = [{ serverName: 'web', enabled: true, disabledTools: ['search'] }]
  assert.match(denyReason(servers, { name: 'mcp__web__search' }), /search/)
  assert.equal(denyReason(servers, { name: 'mcp__web__fetch' }), undefined)
  assert.equal(denyReason(servers, { name: 'read_file' }), undefined)
  assert.equal(denyReason([{ ...servers[0], enabled: false }], { name: 'mcp__web__search' }), undefined)
})

test('gateway mcp entries keep headers and disabled tools on update', () => {
  const first = normalizeServer({ serverName: 'docs', url: 'http://127.0.0.1:4000/docs/mcp', viaGateway: true })
  assert.equal(first.transport, 'streamable-http')
  assert.equal(first.viaGateway, true)
  const second = normalizeServer(
    { serverName: 'docs', url: 'http://127.0.0.1:4000/docs/mcp', enabled: false },
    { ...first, headers: { Authorization: 'Bearer kept' }, disabledTools: ['search'] },
  )
  assert.equal(second.headers.Authorization, 'Bearer kept')
  assert.deepEqual(second.disabledTools, ['search'])
  assert.equal(second.enabled, false)
  assert.throws(() => normalizeServer({ serverName: 'docs', url: 'file:///tmp/x' }), /http/)
  assert.equal(normalizeState({ mcpServers: [{ serverName: 'old', transport: 'stdio', command: 'npx' }, first] }).mcpServers.length, 1)
})

test('mcp client falls back to the copy inside app.asar', async () => {
  const argv = ['/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js']
  const seen = []
  const plugin = await loadMcpPlugin(async (specifier) => {
    seen.push(specifier)
    if (specifier === '@deepseek-ai/dsh-mcp-client') {
      const err = new Error("Cannot find package '@deepseek-ai/dsh-mcp-client'")
      err.code = 'ERR_MODULE_NOT_FOUND'
      throw err
    }
    return { apply() {}, name: 'from-asar' }
  }, argv)
  assert.equal(plugin.name, 'from-asar')
  assert.equal(seen[0], '@deepseek-ai/dsh-mcp-client')
  assert.match(seen[1], /^file:\/\//)
  assert.match(decodeURIComponent(seen[1]), /app\.asar\/dsh\/node_modules\/@deepseek-ai\/dsh-mcp-client\/lib\/index\.js$/)
  assert.equal(mcpClientUrl(['app.asar.unpacked/nope.js']), null)
  await assert.rejects(loadMcpPlugin(async () => {
    throw Object.assign(new Error('boom'), { code: 'ERR_INVALID' })
  }, argv), /boom/)
})

test('supervisor restarts on config change and stops when disabled', async () => {
  const started = []
  const stopped = []
  const supervisor = createSupervisor({
    async start(config) {
      started.push(config.serverName + ':' + config.url)
      return { dispose() { stopped.push(config.serverName) } }
    },
  })
  const server = normalizeServer({ serverName: 'docs', url: 'http://127.0.0.1:4000/a/mcp' })
  await supervisor.reconcile([server])
  await supervisor.reconcile([server])
  const moved = { ...server, url: 'http://127.0.0.1:4000/b/mcp' }
  await supervisor.reconcile([moved])
  await supervisor.reconcile([{ ...moved, enabled: false }])
  assert.deepEqual(started, ['docs:http://127.0.0.1:4000/a/mcp', 'docs:http://127.0.0.1:4000/b/mcp'])
  assert.deepEqual(stopped, ['docs', 'docs'])
})

test('http probe reads tools from a streamable endpoint', async () => {
  const fetchImpl = async (_url, init) => {
    const message = JSON.parse(init.body)
    if (message.method === 'notifications/initialized') return jsonResponse(202, '', { 'mcp-session-id': 'sess' })
    if (message.method === 'tools/list') {
      assert.equal(init.headers['mcp-session-id'], 'sess')
      return jsonResponse(200, { jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'lookup', description: 'Find' }] } })
    }
    return jsonResponse(200, { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2024-11-05' } }, { 'mcp-session-id': 'sess' })
  }
  const result = await probeServer({
    serverName: 'web',
    transport: 'streamable-http',
    url: 'http://127.0.0.1:9/mcp',
  }, { fetchImpl })
  assert.equal(result.tools[0].name, 'lookup')
  assert.equal(result.notice, '')
  const empty = await probeServer({
    serverName: 'deepwiki',
    transport: 'streamable-http',
    url: 'http://127.0.0.1:9/mcp',
  }, {
    fetchImpl: async (_url, init) => {
      const message = JSON.parse(init.body)
      if (message.method === 'notifications/initialized') return jsonResponse(202, '')
      if (message.method === 'tools/list') return jsonResponse(200, { jsonrpc: '2.0', id: 2, result: { tools: [] } })
      return jsonResponse(200, { jsonrpc: '2.0', id: 1, result: {} })
    },
  })
  assert.deepEqual(empty.tools, [])
  assert.match(empty.notice, /没有返回工具/)
})

test('skills scan, preview source, and user toggle', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-home-'))
  const project = await mkdtemp(path.join(tmpdir(), 'dsh-proj-'))
  await mkdir(path.join(project, '.git'))
  await mkdir(path.join(home, 'skills', 'local-skill'), { recursive: true })
  await writeFile(path.join(home, 'skills', 'local-skill', 'SKILL.md'), '---\nname: local-skill\ndescription: 本地\n---\n\n# 正文\n')
  await mkdir(path.join(project, '.dsh', 'skills', 'project-skill'), { recursive: true })
  await writeFile(path.join(project, '.dsh', 'skills', 'project-skill', 'SKILL.md'), '---\ndescription: 项目\n---\n')
  const options = { home, projectRoot: project, agentsHome: path.join(home, 'no-agents') }
  const scanned = await scanSkills(options)
  assert.deepEqual(scanned.skills.map(skill => skill.name).sort(), ['local-skill', 'project-skill'])
  const off = await setSkillEnabled(options, 'local-skill', false)
  assert.equal(off.skills.find(skill => skill.name === 'local-skill').enabled, false)
  await assert.rejects(() => setSkillEnabled(options, 'project-skill', false), /用户目录/)
  const on = await setSkillEnabled(options, 'local-skill', true)
  assert.equal(on.skills.find(skill => skill.name === 'local-skill').source, 'user-dsh')
  assert.equal(await findGitRoot(path.join(project, 'nested', 'dir'), async (target) => target === path.join(project, '.git')), project)
  assert.throws(() => assertCanInstall([{ name: 'local-skill' }], [], ['local-skill']), /不是从资源中心安装的/)
  assertCanInstall([{ name: 'local-skill' }], [{ name: 'local-skill' }], ['local-skill'])
  await rm(home, { recursive: true, force: true })
  await rm(project, { recursive: true, force: true })
})

test('frontmatter, git listing, and http install', async () => {
  const parsed = parseFrontmatter('---\ndescription: >\n  一行\n  两行\n---\n\n提示\n')
  assert.equal(parsed.data.description, '一行 两行')
  assert.match(parsed.body, /提示/)
  assert.deepEqual(gitCloneArgs('https://github.com/acme/skills.git', '/tmp/repo').slice(0, 4), ['clone', '--depth', '1', '--'])
  assert.throws(() => gitCloneArgs('file:///etc', '/tmp/repo'), /Git 地址/)

  const home = await mkdtemp(path.join(tmpdir(), 'dsh-hub-'))
  const repo = await mkdtemp(path.join(tmpdir(), 'dsh-repo-'))
  await mkdir(path.join(repo, 'demo'))
  await writeFile(path.join(repo, 'demo', 'SKILL.md'), '---\ndescription: 远程\n---\n\nhello\n')
  const found = await listSkillDirs(repo)
  assert.equal(found[0].name, 'demo')
  await installHttpSkill({ home }, { name: 'remote-skill', url: 'https://example.com/SKILL.md' }, async (url, init) => {
    assert.equal(url, 'https://example.com/SKILL.md')
    assert.ok(init.signal)
    return jsonResponse(200, '---\nname: remote-skill\ndescription: 远程\n---\n\n正文\n')
  })
  const text = await readFile(path.join(home, 'skills', 'remote-skill', 'SKILL.md'), 'utf8')
  assert.match(text, /正文/)
  await rm(home, { recursive: true, force: true })
  await rm(repo, { recursive: true, force: true })
})

test('state file omits the key and the route is loopback only', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-state-'))
  const store = createStore(home)
  await store.writeKey('sk-local')
  const state = await store.update(current => current)
  assert.equal(JSON.stringify(state).includes('sk-local'), false)
  const keyFile = await readFile(store.keyFile, 'utf8')
  assert.match(keyFile, /sk-local/)
  const env = {}
  assert.equal(publishKey('sk-local', env), true)
  assert.equal(publishKey('other', env), false)
  assert.equal(publishKey('sk-next', env, { force: true }), true)
  assert.equal(env.DSH_LITELLM_KEY, 'sk-next')
  assert.equal(env.LITELLM_MASTER_KEY, undefined)

  const forbidden = response()
  await handle(request({ method: 'GET', url: '/litellm-panel?op=state', address: '8.8.8.8' }), forbidden, { store })
  assert.equal(forbidden.status, 403)

  await rm(home, { recursive: true, force: true })
})

test('sync stores the typed key and a rejected key is explained', async () => {
  const previousKey = process.env.DSH_LITELLM_KEY
  delete process.env.DSH_LITELLM_KEY
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-sync-'))
  const store = createStore(home)
  const seen = []
  const fetchImpl = async (url, init) => {
    seen.push({ url, authorization: init.headers.authorization })
    if (String(url).endsWith('/model/info')) return jsonResponse(404, {})
    return jsonResponse(200, { data: [{ id: 'kimi-k3' }] })
  }
  const synced = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.sync', baseUrl: 'http://127.0.0.1:4000/', apiKey: 'sk-typed' },
  }), synced, { store, fetch: fetchImpl })
  assert.equal(synced.status, 200)
  assert.equal(seen[0].authorization, 'Bearer sk-typed')
  assert.equal(JSON.parse(synced.body).litellm.catalog[0].id, 'kimi-k3')
  assert.equal(JSON.parse(synced.body).litellm.keySaved, true)
  const noted = []
  const notedHome = await mkdtemp(path.join(tmpdir(), 'dsh-sync-'))
  const notedStore = createStore(notedHome)
  const notedResponse = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.key', apiKey: 'sk-noted' },
  }), notedResponse, {
    store: notedStore,
    async onKey(key) { noted.push(key) },
  })
  assert.equal(notedResponse.status, 200)
  assert.deepEqual(noted, ['sk-noted'])
  await rm(notedHome, { recursive: true, force: true })
  assert.equal(JSON.stringify(JSON.parse(synced.body)).includes('sk-typed'), false)
  assert.match(await readFile(store.keyFile, 'utf8'), /sk-typed/)

  delete process.env.DSH_LITELLM_KEY
  const missing = response()
  const emptyHome = await mkdtemp(path.join(tmpdir(), 'dsh-sync-'))
  const empty = createStore(emptyHome)
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.sync', baseUrl: 'http://127.0.0.1:4000' },
  }), missing, { store: empty, fetch: fetchImpl })
  assert.equal(missing.status, 400)
  assert.match(JSON.parse(missing.body).error, /虚拟钥匙/)

  await assert.rejects(
    fetchCatalog('http://127.0.0.1:4000', 'sk-nope', async () => jsonResponse(401, { error: 'no' })),
    /Virtual Key/,
  )
  await rm(home, { recursive: true, force: true })
  await rm(emptyHome, { recursive: true, force: true })
  if (previousKey === undefined) delete process.env.DSH_LITELLM_KEY
  else process.env.DSH_LITELLM_KEY = previousKey
})

test('gateway mcp and skill lists drop secrets', async () => {
  const servers = parseGatewayMcp([
    { server_name: 'deepwiki', transport: 'http', url: 'https://mcp.deepwiki.com/mcp', auth_type: 'none', credentials: { token: 'secret-token' } },
    { server_name: 'tavily', transport: 'http', url: 'https://mcp.tavily.com/mcp/', auth_type: 'bearer_token', static_headers: { Authorization: 'Bearer hidden' } },
  ])
  assert.equal(servers[0].needsCredential, false)
  assert.equal(servers[0].transport, 'streamable-http')
  assert.equal(servers[1].needsCredential, true)
  assert.equal(JSON.stringify(servers).includes('secret-token'), false)
  assert.equal(JSON.stringify(servers).includes('hidden'), false)
  const skills = parseSkillHub({
    plugins: [{ name: 'notion-to-md', description: '导出', source: { source: 'git-subdir', url: 'https://github.com/acme/skills', path: 'skills/notion-to-md' } }],
  })
  assert.equal(skills[0].kind, 'git')
  assert.equal(skills[0].url, 'https://github.com/acme/skills')

  const home = await mkdtemp(path.join(tmpdir(), 'dsh-pull-'))
  const store = createStore(home)
  await store.writeKey('sk-saved')
  const pulled = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'mcp.pull' },
  }), pulled, {
    store,
    fetch: async (url) => {
      assert.match(url, /\/v1\/mcp\/server$/)
      return jsonResponse(200, [{ server_name: 'deepwiki', transport: 'http', url: 'https://mcp.deepwiki.com/mcp', auth_type: 'none' }])
    },
  })
  assert.equal(pulled.status, 200)
  const listed = JSON.parse(pulled.body).servers[0]
  assert.equal(listed.serverName, 'deepwiki')
  assert.equal(listed.viaGateway, true)
  assert.equal(listed.url, 'http://127.0.0.1:4000/deepwiki/mcp')
  assert.equal(JSON.stringify(listed).includes('mcp.deepwiki.com'), false)
  const gatewayFetch = async () => jsonResponse(200, [{ server_name: 'deepwiki', transport: 'http', url: 'https://mcp.deepwiki.com/mcp', auth_type: 'none' }])
  const adopted = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'mcp.save', serverName: 'deepwiki', url: 'https://evil.example/mcp', transport: 'stdio', command: 'rm' },
  }), adopted, { store, fetch: gatewayFetch, supervisor: { async reconcile() {} } })
  assert.equal(adopted.status, 200)
  assert.equal(JSON.stringify(JSON.parse(adopted.body)).includes('sk-saved'), false)
  const stored = await store.read()
  assert.equal(stored.mcpServers[0].viaGateway, true)
  assert.equal(stored.mcpServers[0].url, 'http://127.0.0.1:4000/deepwiki/mcp')
  assert.equal(stored.mcpServers[0].command, undefined)
  assert.equal(stored.mcpServers[0].headers.Authorization, 'Bearer sk-saved')
  const unknown = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'mcp.save', serverName: 'not-offered', url: 'https://evil.example/mcp' },
  }), unknown, { store, fetch: gatewayFetch, supervisor: { async reconcile() {} } })
  assert.equal(unknown.status, 404)
  assert.equal((await store.read()).mcpServers.length, 1)
  await rm(home, { recursive: true, force: true })
})

test('skills install only from the gateway list, never from the request', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-install-'))
  const store = createStore(home)
  await store.writeKey('sk-saved')
  const fetched = []
  const fetchImpl = async (url) => {
    fetched.push(String(url))
    if (String(url).endsWith('/claude-code/plugins')) {
      return jsonResponse(200, { plugins: [{ name: 'offered', description: 'd', source: { source: 'url', url: 'https://skills.example/offered/SKILL.md' } }] })
    }
    return jsonResponse(200, '---\nname: offered\ndescription: d\n---\n\n正文\n')
  }
  const deps = { store, home, projectRoot: home, agentsHome: path.join(home, 'no-agents'), fetch: fetchImpl }
  const installed = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'hub.install', names: ['offered'], url: 'https://evil.example/SKILL.md', kind: 'http' },
  }), installed, deps)
  assert.equal(installed.status, 200)
  assert.deepEqual(fetched.filter(url => !url.endsWith('/claude-code/plugins')), ['https://skills.example/offered/SKILL.md'])
  assert.equal(fetched.some(url => url.includes('evil.example')), false)
  assert.match(await readFile(path.join(home, 'skills', 'offered', 'SKILL.md'), 'utf8'), /正文/)
  assert.equal((await store.read()).hub[0].url, 'https://skills.example/offered/SKILL.md')
  const missing = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'hub.install', names: ['other'], url: 'https://evil.example/SKILL.md' },
  }), missing, deps)
  assert.equal(missing.status, 404)
  assert.equal((await store.read()).hub.length, 1)
  await rm(home, { recursive: true, force: true })
})

test('gateway calls carry a deadline', async () => {
  const signals = []
  const fetchImpl = async (url, init) => {
    signals.push(init.signal)
    return String(url).endsWith('/model/info') ? jsonResponse(404, {}) : jsonResponse(200, { data: [{ id: 'm' }] })
  }
  await fetchCatalog('http://127.0.0.1:4000', 'sk-test', fetchImpl)
  assert.equal(signals.length, 2)
  assert.ok(signals.every(signal => signal instanceof AbortSignal))
})

test('trace log is read from its tail and trimmed when it grows', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-trace-'))
  const store = createStore(home)
  const filler = 'x'.repeat(100 * 1024)
  for (let id = 0; id < 50; id += 1) await store.appendTrace({ id, filler })
  assert.ok((await stat(store.traceFile)).size < 4 * 1024 * 1024)
  const traces = await store.readTraces()
  assert.equal(traces.at(-1).id, 49)
  assert.ok(traces.length >= 5)
  assert.deepEqual(traces.map(row => row.id), [...traces.map(row => row.id)].sort((a, b) => a - b))
  assert.equal((await store.readTraces(2)).map(row => row.id).join(), '48,49')
  await rm(home, { recursive: true, force: true })
})

test('host declares the services it reads', () => {
  assert.ok(inject.includes('webServer'))
  assert.ok(inject.includes('configEditor'))
  assert.ok(inject.includes('tools'))
  assert.ok(inject.includes('credentials'))
})

test('client registers the sidebar page', () => {
  const registered = []
  const document = {
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild() {} },
  }
  const sandbox = { console, document, fetch() {} }
  sandbox.window = sandbox
  sandbox.__ModuleLoader__ = {
    load({ factory }) {
      const api = factory((id) => {
        if (id !== 'react') throw new Error(id)
        return {
          createElement: (type, props, ...children) => ({ type, props, children }),
          useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
          useEffect: () => {},
        }
      })
      api.apply({
        slots: {
          inject(_name, fn) { fn() },
          register(spec) {
            registered.push(spec)
            return () => {}
          },
        },
      })
    },
  }
  const code = readFileSync(path.join(root, 'lib', 'client.js'), 'utf8')
  vm.runInNewContext(code, sandbox, { filename: 'client.js' })
  assert.deepEqual(registered.map(spec => spec.key || spec.id), ['litellm-panel', 'litellm-panel'])
  assert.equal(registered[1].label, 'LiteLLM资源中心')
  assert.equal(code.includes('添加 MCP Server'), false)
  assert.equal(code.includes('Git 仓库'), false)
  assert.equal(code.includes('LiteLLM 上的技能'), true)
  assert.equal(code.includes("['models', '模型']"), true)
  assert.equal(code.includes('未安装'), true)
  assert.equal(code.includes('skill.enabled'), true)
  assert.equal(code.includes('保存钥匙'), false)
  assert.equal(code.includes('供应商 ID'), false)
  assert.equal(code.includes('已启动'), false)
  assert.equal(code.includes('重新连接'), true)
  assert.equal(code.includes('百万'), true)
  assert.equal(code.includes('plugin.version'), true)
  assert.equal(code.includes('已是最新'), true)
  assert.equal(code.includes("join('、')"), true)
  assert.equal(code.includes('setUTCMonth'), true)
  assert.equal(code.includes('这里不填'), true)
  assert.equal(code.includes('Sync Models'), false)
  assert.equal(code.includes('网关没有返回工具'), true)
  assert.equal(code.includes('按技能估算'), false)
  assert.equal(code.includes('litellm.ping'), true)
  assert.equal(code.includes('litellm.enabled'), true)
  assert.equal(code.includes('urc-dot'), true)
  assert.equal(code.includes('urc-progress'), true)
  assert.equal(code.includes('详情'), true)
  assert.equal(code.includes('这里不提供修改'), true)
  assert.equal(code.includes('本机已有'), true)
  assert.equal(code.includes('~/.agents/skills'), true)
  assert.equal(code.includes('正在'), true)
})

test('a missing gateway switch stays on and keeps a stored input list', () => {
  const next = normalizeState({
    litellm: {
      catalog: [{ id: 'deepseek-v4.1-flash', input: ['text', 'image'], attributes: [{ key: 'mode', value: 'chat' }] }],
    },
  })
  assert.equal(next.litellm.enabled, true)
  assert.deepEqual(next.litellm.catalog[0].input, ['text', 'image'])
  assert.equal(next.litellm.catalog[0].attributes[0].key, 'mode')
  assert.equal(normalizeState({ litellm: { enabled: false } }).litellm.enabled, false)
})

test('turning the gateway off keeps selections and stops models and mcp', async () => {
  const previousKey = process.env.DSH_LITELLM_KEY
  delete process.env.DSH_LITELLM_KEY
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-switch-'))
  const store = createStore(home)
  await store.writeKey('sk-saved')
  await store.update(current => ({
    ...current,
    litellm: {
      ...current.litellm,
      enabledModelIds: ['deepseek-v4.1-flash'],
      catalog: [{
        id: 'deepseek-v4.1-flash',
        contextWindow: 1000000,
        maxTokens: 128000,
        input: ['text', 'image'],
        reasoningSource: 'gateway',
        reasoningEfforts: { low: 'low', high: 'high', max: 'max' },
      }],
    },
    mcpServers: [{ serverName: 'deepwiki', transport: 'streamable-http', url: 'http://127.0.0.1:4000/deepwiki/mcp', enabled: true }],
  }))
  const reconciled = []
  const edits = []
  const editor = {
    entries: () => [{ options: { id: 'llm-pi-ai' } }],
    async edit(_entry, change) {
      edits.push(change({}, {}))
    },
  }
  const supervisor = {
    async reconcile(servers) {
      reconciled.push(servers.map(server => server.serverName))
    },
  }
  const off = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.enabled', enabled: false },
  }), off, { store, editor, supervisor })
  assert.equal(off.status, 200)
  const offBody = JSON.parse(off.body)
  assert.equal(offBody.litellm.enabled, false)
  assert.deepEqual(offBody.litellm.enabledModelIds, ['deepseek-v4.1-flash'])
  assert.equal(offBody.litellm.catalog[0].input.join(','), 'text,image')
  assert.deepEqual(reconciled.at(-1), [])
  assert.equal(edits.at(-1).providers.litellm, undefined)
  assert.equal((await store.read()).mcpServers[0].serverName, 'deepwiki')
  const quiet = response()
  let probed = false
  await handle(request({ method: 'GET', url: '/litellm-panel?op=litellm.ping' }), quiet, {
    store,
    fetch: async () => {
      probed = true
      return jsonResponse(200, {})
    },
  })
  assert.equal(probed, false)
  assert.equal(JSON.parse(quiet.body).status, 'off')
  assert.equal(JSON.parse(quiet.body).message, '已关闭')

  const saved = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.save', providerId: 'litellm', modelIds: ['deepseek-v4.1-flash'], apply: true },
  }), saved, { store, editor, supervisor })
  assert.equal(saved.status, 200)
  assert.deepEqual(JSON.parse(saved.body).litellm.enabledModelIds, ['deepseek-v4.1-flash'])
  assert.equal(edits.at(-1).providers.litellm, undefined)

  const on = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.enabled', enabled: true },
  }), on, {
    store,
    editor,
    supervisor,
    fetch: async (url) => {
      if (String(url).endsWith('/model/info')) return jsonResponse(404, {})
      return jsonResponse(200, { data: [{ id: 'deepseek-v4.1-flash' }, { id: 'glm-5.3-flash' }] })
    },
  })
  assert.equal(on.status, 200)
  const onBody = JSON.parse(on.body)
  assert.equal(onBody.litellm.enabled, true)
  assert.deepEqual(onBody.litellm.enabledModelIds, ['deepseek-v4.1-flash', 'glm-5.3-flash'])
  assert.deepEqual(reconciled.at(-1), ['deepwiki'])
  assert.deepEqual(edits.at(-1).providers.litellm.models.map(model => model.id), ['deepseek-v4.1-flash', 'glm-5.3-flash'])
  const narrowed = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.save', providerId: 'litellm', modelIds: ['glm-5.3-flash'], apply: true },
  }), narrowed, { store, editor, supervisor })
  assert.equal(narrowed.status, 200)
  assert.deepEqual(edits.at(-1).providers.litellm.models.map(model => model.id), ['glm-5.3-flash'])
  const cleared = response()
  await handle(request({
    method: 'POST',
    url: '/litellm-panel',
    body: { op: 'litellm.save', providerId: 'litellm', modelIds: [], apply: true },
  }), cleared, { store, editor, supervisor })
  assert.equal(cleared.status, 200)
  assert.equal(edits.at(-1).providers.litellm, undefined)

  const up = response()
  await handle(request({ method: 'GET', url: '/litellm-panel?op=litellm.ping' }), up, {
    store,
    fetch: async () => jsonResponse(200, { data: [] }),
  })
  assert.equal(JSON.parse(up.body).status, 'on')
  assert.equal(JSON.stringify(JSON.parse(up.body)).includes('sk-saved'), false)
  const down = response()
  await handle(request({ method: 'GET', url: '/litellm-panel?op=litellm.ping' }), down, {
    store,
    fetch: async () => jsonResponse(401, { error: 'no' }),
  })
  assert.equal(JSON.parse(down.body).status, 'down')
  assert.match(JSON.parse(down.body).message, /HTTP 401/)
  assert.equal(JSON.parse(down.body).message.includes('sk-saved'), false)
  await rm(home, { recursive: true, force: true })
  if (previousKey === undefined) delete process.env.DSH_LITELLM_KEY
  else process.env.DSH_LITELLM_KEY = previousKey
})

test('dsh drops a skill whose frontmatter cannot be loaded', () => {
  assert.equal(dshSkillIssue('weekly-work-plan', { name: 'weekly-work-plan', description: '计划' }), '')
  assert.match(dshSkillIssue('Bad_Name', { name: 'Bad_Name', description: 'x' }), /kebab-case/)
  assert.match(dshSkillIssue('weekly-work-plan', { description: '计划' }), /缺少 name/)
  assert.match(dshSkillIssue('weekly-work-plan', { name: 'other', description: '计划' }), /不一致/)
  assert.match(dshSkillIssue('weekly-work-plan', { name: 'weekly-work-plan' }), /description/)
})

function jsonResponse(status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headers[name.toLowerCase()] || null },
    json: async () => (typeof body === 'string' ? JSON.parse(body || 'null') : body),
    text: async () => text,
  }
}

test('release status compares npm and only updates an installed profile', async () => {
  assert.equal(compareVersions('0.2.1', '0.2.0'), 1)
  assert.equal(compareVersions('0.2.0', '0.2.1'), -1)
  assert.equal(compareVersions('0.2.10', '0.2.9'), 1)
  assert.equal(compareVersions('0.2.1', '0.2.1'), 0)
  assert.equal(compareVersions('0.2.1', 'nope'), null)
  const installed = pathToFileURL(path.resolve('/tmp/profiles/desktop/node_modules/.pnpm/pkg/node_modules/dsh-litellm-panel/lib/release.js'))
  assert.equal(findProfile(installed).name, 'desktop')
  assert.equal(findProfile(pathToFileURL(path.resolve('/tmp/checkout/dsh-resource-center/lib/release.js'))), null)

  const fetch = async () => jsonResponse(200, { version: '0.9.0' })
  const dev = await releaseStatus({ current: '0.2.1', fetch, moduleUrl: pathToFileURL(path.resolve('/tmp/checkout/lib/release.js')) })
  assert.equal(dev.updateAvailable, true)
  assert.equal(dev.canUpdate, false)
  const ready = await releaseStatus({ current: '0.2.1', fetch, moduleUrl: installed })
  assert.equal(ready.canUpdate, true)
  assert.equal(ready.profile, 'desktop')
  const same = await releaseStatus({ current: '0.9.0', fetch, moduleUrl: installed })
  assert.equal(same.updateAvailable, false)

  const calls = []
  const updated = await applyUpdate({
    current: '0.2.1',
    fetch,
    moduleUrl: installed,
    spawn(profile, version) { calls.push([profile.name, profile.dir, version]) },
  })
  assert.equal(updated.installed, '0.9.0')
  assert.equal(updated.restart, true)
  assert.equal(calls[0][0], 'desktop')
  assert.equal(calls[0][2], '0.9.0')
  await assert.rejects(applyUpdate({
    current: '0.9.0',
    fetch,
    moduleUrl: installed,
    spawn() { throw new Error('should not install') },
  }), /已经是最新版本/)

  const listed = response()
  await handle(request({ method: 'GET', url: '/litellm-panel?op=plugin.version' }), listed, {
    fetch,
    packageVersion: '0.2.1',
    moduleUrl: installed,
  })
  assert.equal(listed.status, 200)
  assert.equal(JSON.parse(listed.body).canUpdate, true)
  const ran = []
  const posted = response()
  await handle(request({ method: 'POST', url: '/litellm-panel', body: { op: 'plugin.update' } }), posted, {
    fetch,
    packageVersion: '0.2.1',
    moduleUrl: installed,
    spawnUpdate(profile, version) { ran.push(`${profile.name}@${version}`) },
  })
  assert.equal(posted.status, 200)
  assert.deepEqual(ran, ['desktop@0.9.0'])
  assert.equal(JSON.parse(posted.body).installed, '0.9.0')
})

function response() {
  return {
    status: 0,
    body: '',
    headersSent: false,
    writeHead(status) {
      this.status = status
      this.headersSent = true
    },
    end(body) {
      this.body = body
      this.headersSent = true
    },
  }
}

function request({ method, url, body, address = '127.0.0.1', host = '127.0.0.1:3080' }) {
  const stream = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : [])
  stream.method = method
  stream.url = url
  stream.headers = { host }
  stream.socket = { remoteAddress: address }
  return stream
}

