/**
 * One loopback route. The browser sends an op; disk and process work stay here.
 */
import { isLoopback, readBody, send } from './loopback.js'
import { applyProvider, fetchCatalog, fetchGatewayMcp, fetchSkillHub, fetchSpend, normalizeBaseUrl, pingGateway, presentModel } from './litellm.js'
import { denyReason, normalizeServer, probeServer, redactServer, redactUrl, withGatewayKey } from './mcp.js'
import {
  attributeSpend,
} from './spend.js'
import { KEY_ENV, publishKey } from './store.js'
import {
  findGitRoot,
  assertCanInstall,
  installGitSkills,
  installHttpSkill,
  previewSkill,
  scanSkills,
  setSkillEnabled,
  uninstallHubSkill,
} from './skills.js'

export const ROUTE_PATH = '/litellm-panel'

export function createHandler(deps) {
  return function handler(req, res) {
    handle(req, res, deps).catch((err) => {
      if (!res.headersSent) send(res, statusOf(err), { ok: false, error: messageOf(err) })
    })
  }
}

export async function handle(req, res, deps) {
  if (!isLoopback(req)) {
    send(res, 403, { ok: false, error: '只接受本机页面' })
    return
  }
  try {
    const url = new URL(req.url || ROUTE_PATH, 'http://127.0.0.1')
    if (req.method === 'GET' || req.method === 'HEAD') {
      const op = url.searchParams.get('op') || 'state'
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end()
        return
      }
      if (op === 'state') {
        send(res, 200, await statePayload(deps))
        return
      }
      if (op === 'preview') {
        const scanned = await scan(deps)
        send(res, 200, { ok: true, preview: await previewSkill(scanned, url.searchParams.get('name') || '') })
        return
      }
      if (op === 'spend') {
        send(res, 200, await spendPayload(deps, url.searchParams))
        return
      }
      if (op === 'litellm.ping') {
        send(res, 200, await pingPayload(deps))
        return
      }
      send(res, 404, { ok: false, error: '没有这个操作' })
      return
    }
    if (req.method !== 'POST') {
      send(res, 405, { ok: false, error: '只接受 GET 和 POST' })
      return
    }
    const body = await readBody(req)
    const op = body.op
    if (op === 'litellm.key') {
      await deps.store.writeKey(body.apiKey)
      const key = await resolveKey(deps)
      if (key) await rememberKey(deps, key)
      if (key) await refreshGatewayKeys(deps, key)
      send(res, 200, { ok: true, keySaved: Boolean(key) })
      return
    }
    if (op === 'litellm.sync') {
      const baseUrl = normalizeBaseUrl(body.baseUrl || (await deps.store.read()).litellm.baseUrl)
      const key = await acceptKey(deps, body)
      const catalog = await fetchCatalog(baseUrl, key, deps.fetch)
      const state = await deps.store.update((current) => ({
        ...current,
        litellm: { ...current.litellm, baseUrl, catalog, syncedAt: new Date().toISOString() },
      }))
      await refreshGatewayKeys(deps, key)
      send(res, 200, { ok: true, litellm: publicLitellm(state, key) })
      return
    }
    if (op === 'litellm.save') {
      const current = await deps.store.read()
      const baseUrl = normalizeBaseUrl(body.baseUrl || current.litellm.baseUrl)
      const providerId = String(body.providerId || current.litellm.providerId || 'litellm')
      const modelIds = Array.isArray(body.modelIds) ? body.modelIds.filter(id => typeof id === 'string') : []
      const state = await deps.store.update((snapshot) => ({
        ...snapshot,
        litellm: { ...snapshot.litellm, baseUrl, providerId, enabledModelIds: modelIds },
      }))
      let applied = null
      if (body.apply === true) {
        const key = await resolveKey(deps)
        if (key) await rememberKey(deps, key)
        const liveIds = state.litellm.enabled === false ? [] : modelIds
        applied = await applyGateway(deps, state, liveIds)
      }
      send(res, 200, { ok: true, litellm: publicLitellm(state, await resolveKey(deps)), applied })
      return
    }
    if (op === 'litellm.enabled') {
      const current = await deps.store.read()
      const enabled = body.enabled !== false
      const baseUrl = body.baseUrl ? normalizeBaseUrl(body.baseUrl) : current.litellm.baseUrl
      if (!enabled) {
        const state = await deps.store.update((snapshot) => ({
          ...snapshot,
          litellm: { ...snapshot.litellm, enabled: false, baseUrl },
        }))
        await reconcile(deps, state)
        const applied = await applyGateway(deps, state, [])
        send(res, 200, { ok: true, litellm: publicLitellm(state, await resolveKey(deps)), applied })
        return
      }
      const key = await acceptKey(deps, body)
      const catalog = await fetchCatalog(baseUrl, key, deps.fetch)
      const modelIds = catalog.map(row => row.id)
      const state = await deps.store.update((snapshot) => ({
        ...snapshot,
        litellm: {
          ...snapshot.litellm,
          enabled: true,
          baseUrl,
          catalog,
          syncedAt: new Date().toISOString(),
          enabledModelIds: modelIds,
        },
      }))
      await reconcile(deps, state)
      const applied = await applyGateway(deps, state, modelIds)
      send(res, 200, { ok: true, litellm: publicLitellm(state, key), applied })
      return
    }
    if (op === 'mcp.pull') {
      const state = await deps.store.read()
      const key = await acceptKey(deps, body)
      const servers = await fetchGatewayMcp(state.litellm.baseUrl, key, deps.fetch)
      send(res, 200, { ok: true, servers })
      return
    }
    if (op === 'mcp.save') {
      const current = await deps.store.read()
      const previous = current.mcpServers.find(server => server.serverName === body.serverName)
      const key = await acceptKey(deps, {})
      const offered = (await fetchGatewayMcp(current.litellm.baseUrl, key, deps.fetch))
        .find(item => item.serverName === body.serverName)
      if (!offered) throw Object.assign(new Error('网关没有把这个 MCP 服务器分发给这把钥匙'), { status: 404 })
      const server = withGatewayKey(normalizeServer({ ...offered, enabled: body.enabled !== false }, previous), key)
      const state = await deps.store.update((snapshot) => {
        const others = snapshot.mcpServers.filter(item => item.serverName !== server.serverName)
        return { ...snapshot, mcpServers: [...others, server] }
      })
      touch(deps, state)
      await reconcile(deps, state)
      send(res, 200, { ok: true, server: redactServer(server, deps.supervisor) })
      return
    }
    if (op === 'mcp.probe') {
      const current = await deps.store.read()
      const server = current.mcpServers.find(item => item.serverName === body.serverName)
      if (!server) {
        send(res, 404, { ok: false, error: '没有这个 MCP 服务器' })
        return
      }
      const result = await probeServer(server, { fetchImpl: deps.fetch })
      send(res, 200, { ok: true, tools: result.tools, notice: result.notice || '' })
      return
    }
    if (op === 'mcp.delete') {
      const state = await deps.store.update((snapshot) => ({
        ...snapshot,
        mcpServers: snapshot.mcpServers.filter(server => server.serverName !== body.serverName),
      }))
      touch(deps, state)
      await reconcile(deps, state)
      send(res, 200, { ok: true })
      return
    }
    if (op === 'mcp.enabled' || op === 'mcp.tools') {
      const state = await deps.store.update((snapshot) => ({
        ...snapshot,
        mcpServers: snapshot.mcpServers.map((server) => {
          if (server.serverName !== body.serverName) return server
          if (op === 'mcp.enabled') return { ...server, enabled: body.enabled !== false }
          const disabledTools = Array.isArray(body.disabledTools) ? body.disabledTools.filter(name => typeof name === 'string') : []
          return { ...server, disabledTools }
        }),
      }))
      touch(deps, state)
      if (op === 'mcp.enabled') await reconcile(deps, state)
      send(res, 200, { ok: true, mcpServers: state.mcpServers.map(server => redactServer(server, deps.supervisor)) })
      return
    }
    if (op === 'skill.enabled') {
      const scanned = await setSkillEnabled(await skillOptions(deps), String(body.name || ''), body.enabled === true)
      send(res, 200, { ok: true, skills: publicSkills(scanned) })
      return
    }
    if (op === 'hub.pull') {
      const state = await deps.store.read()
      const key = await acceptKey(deps, body)
      const skills = await fetchSkillHub(state.litellm.baseUrl, key, deps.fetch)
      send(res, 200, { ok: true, skills })
      return
    }
    if (op === 'hub.install') {
      const names = Array.isArray(body.names) ? body.names.filter(name => typeof name === 'string') : []
      if (names.length === 0) throw Object.assign(new Error('没有选中的技能'), { status: 400 })
      const options = await skillOptions(deps)
      const scanned = await scanSkills(options)
      const current = await deps.store.read()
      assertCanInstall(scanned.skills, current.hub, names)
      // The source always comes from the gateway's own list, never from the request.
      const offered = await fetchSkillHub(current.litellm.baseUrl, await acceptKey(deps, {}), deps.fetch)
      const picked = names.map((name) => {
        const row = offered.find(item => item.name === name)
        if (!row) throw Object.assign(new Error(`网关没有把 ${name} 分发给这把钥匙`), { status: 404 })
        return row
      })
      const records = []
      const gitSources = new Map()
      for (const row of picked) {
        if (row.kind === 'git') gitSources.set(row.url, [...(gitSources.get(row.url) || []), row.name])
        else records.push(await installHttpSkill(options, row, deps.fetch))
      }
      for (const [url, skillNames] of gitSources) records.push(...await installGitSkills(options, url, skillNames, deps))
      const state = await deps.store.update((snapshot) => ({
        ...snapshot,
        hub: mergeHub(snapshot.hub, records),
      }))
      send(res, 200, { ok: true, hub: state.hub, skills: publicSkills(await scan(deps)) })
      return
    }
    if (op === 'hub.update' || op === 'hub.uninstall') {
      const name = String(body.name || '')
      const current = await deps.store.read()
      const record = current.hub.find(item => item.name === name)
      if (!record) {
        send(res, 404, { ok: false, error: '这个技能不是从资源中心安装的' })
        return
      }
      if (op === 'hub.uninstall') {
        await uninstallHubSkill(await skillOptions(deps), record)
        const state = await deps.store.update((snapshot) => ({
          ...snapshot,
          hub: snapshot.hub.filter(item => item.name !== name),
        }))
        send(res, 200, { ok: true, hub: state.hub, skills: publicSkills(await scan(deps)) })
        return
      }
      const options = await skillOptions(deps)
      const records = record.kind === 'git'
        ? await installGitSkills(options, record.url, [record.name], deps)
        : [await installHttpSkill(options, { name: record.name, url: record.url }, deps.fetch)]
      const state = await deps.store.update((snapshot) => ({
        ...snapshot,
        hub: mergeHub(snapshot.hub, records),
      }))
      send(res, 200, { ok: true, hub: state.hub })
      return
    }
    if (op === 'spend.observe') {
      const state = await deps.store.update((snapshot) => ({ ...snapshot, observeModelCalls: body.enabled !== false }))
      touch(deps, state)
      send(res, 200, { ok: true, observeModelCalls: state.observeModelCalls })
      return
    }
    send(res, 404, { ok: false, error: '没有这个操作' })
  } catch (err) {
    if (!res.headersSent) send(res, statusOf(err), { ok: false, error: messageOf(err) })
  }
}

function mergeHub(current, records) {
  const next = current.filter(item => !records.some(record => record.name === item.name))
  return [...next, ...records]
}

async function statePayload(deps) {
  const state = await deps.store.read()
  const key = await resolveKey(deps)
  const scanned = await scan(deps)
  return {
    ok: true,
    observeModelCalls: state.observeModelCalls,
    litellm: publicLitellm(state, key),
    mcpServers: state.mcpServers.map(server => redactServer(server, deps.supervisor)),
    skills: publicSkills(scanned),
    roots: scanned.roots,
    hub: state.hub.map(publicHub),
    guard: Boolean(deps.guard),
  }
}

function publicHub(item) {
  let url = item.url
  try {
    url = redactUrl(item.url)
  } catch {
    url = item.url
  }
  return { ...item, url }
}

function publicLitellm(state, key) {
  return {
    baseUrl: state.litellm.baseUrl,
    providerId: state.litellm.providerId,
    enabled: state.litellm.enabled !== false,
    enabledModelIds: state.litellm.enabledModelIds,
    catalog: state.litellm.catalog.map(presentModel),
    syncedAt: state.litellm.syncedAt,
    keySaved: Boolean(key),
  }
}

function publicSkills(scanned) {
  return scanned.skills.map(skill => ({
    name: skill.name,
    source: skill.source,
    rank: skill.rank,
    kind: skill.kind,
    description: skill.description || '',
    enabled: skill.enabled !== false,
    writable: skill.writable === true,
    error: skill.error || null,
  }))
}

async function skillOptions(deps) {
  const home = deps.home
  const projectRoot = deps.projectRoot || await findGitRoot(deps.cwd || process.cwd())
  return { home, projectRoot, agentsHome: deps.agentsHome }
}

async function scan(deps) {
  return scanSkills(await skillOptions(deps))
}

async function resolveKey(deps) {
  const saved = await deps.store.readKey()
  return saved || process.env[KEY_ENV] || null
}

async function refreshGatewayKeys(deps, key) {
  const state = await deps.store.update((snapshot) => ({
    ...snapshot,
    mcpServers: snapshot.mcpServers.map(server => withGatewayKey(server, key)),
  }))
  touch(deps, state)
  await reconcile(deps, state)
  return state
}

async function acceptKey(deps, body) {
  const typed = body && typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (typed) {
    await deps.store.writeKey(typed)
    await rememberKey(deps, typed)
  }
  const key = await resolveKey(deps)
  if (!key) throw Object.assign(new Error('还没有虚拟钥匙。先在 LiteLLM 选项卡填写发给你的 Virtual Key，再同步。'), { status: 400 })
  return key
}

async function rememberKey(deps, key) {
  if (!key) return
  publishKey(key, process.env, { force: true })
  if (typeof deps.onKey === 'function') await deps.onKey(key)
}

function touch(deps, state) {
  if (typeof deps.touch === 'function') deps.touch(state)
}

async function reconcile(deps, state) {
  if (!deps.supervisor) return
  const live = state.litellm && state.litellm.enabled === false ? [] : state.mcpServers
  await deps.supervisor.reconcile(live)
}

function gatewayModels(state, modelIds) {
  const ids = modelIds.filter(id => typeof id === 'string')
  return {
    providerId: state.litellm.providerId || 'litellm',
    baseUrl: state.litellm.baseUrl,
    modelIds: ids,
    models: state.litellm.catalog.filter(row => ids.includes(row.id)).map(presentModel),
  }
}

async function applyGateway(deps, state, modelIds) {
  return applyProvider(deps.editor, gatewayModels(state, modelIds))
}

async function pingPayload(deps) {
  const state = await deps.store.read()
  const enabled = state.litellm.enabled !== false
  if (!enabled) return { ok: true, enabled: false, status: 'off', message: '已关闭' }
  const key = await resolveKey(deps)
  if (!key) return { ok: true, enabled: true, status: 'nokey', message: '还没有虚拟钥匙' }
  try {
    const reached = await pingGateway(state.litellm.baseUrl, key, deps.fetch)
    if (reached.ok) return { ok: true, enabled: true, status: 'on', message: '生效中' }
    return { ok: true, enabled: true, status: 'down', message: `未连通（HTTP ${reached.status}）` }
  } catch {
    return { ok: true, enabled: true, status: 'down', message: '未连通' }
  }
}

async function spendPayload(deps, params) {
  const start = params.get('start') || ''
  const end = params.get('end') || ''
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw Object.assign(new Error('开始日期格式要是 YYYY-MM-DD'), { status: 400 })
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw Object.assign(new Error('结束日期格式要是 YYYY-MM-DD'), { status: 400 })
  const state = await deps.store.read()
  const key = await acceptKey(deps, {})
  const logs = await fetchSpend(state.litellm.baseUrl, key, { start, end }, deps.fetch)
  const traces = await deps.store.readTraces()
  const marks = traces.filter(row => row && row.kind === 'skill')
  const calls = traces.filter(row => row && row.kind !== 'skill')
  const joined = attributeSpend(logs, calls, marks)
  return { ok: true, ...joined, observeModelCalls: state.observeModelCalls }
}

export function guardFrom(servers) {
  return execution => denyReason(servers, execution)
}

function statusOf(err) {
  return err && Number.isInteger(err.status) ? err.status : 500
}

function messageOf(err) {
  if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return '连接超时'
  return err instanceof Error && err.message ? err.message : '内部错误'
}
