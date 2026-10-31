/**
 * LiteLLM gateway reads: model list, model info, and spend logs.
 * Callers authenticate with their own virtual key. The master key stays on the gateway.
 */
import { KEY_ENV } from './store.js'

const PROVIDER_ID = /^[a-z][a-z0-9-]{0,31}$/

export function normalizeBaseUrl(input) {
  let url
  try {
    url = new URL(String(input || '').trim())
  } catch {
    throw httpError('Base URL 不是合法地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw httpError('Base URL 只接受 http 或 https')
  if (url.username || url.password) throw httpError('不要把密钥写进 Base URL')
  url.hash = ''
  url.search = ''
  let text = url.toString()
  if (text.endsWith('/')) text = text.slice(0, -1)
  return text
}

export function assertProviderId(id) {
  if (!PROVIDER_ID.test(id)) throw httpError('供应商 ID 要是小写字母开头，只能含小写、数字和连字符')
  return id
}

export function parseModelList(payload) {
  const rows = []
  const data = payload && Array.isArray(payload.data) ? payload.data : []
  for (const row of data) {
    const id = row && (row.id || row.model_name)
    if (typeof id === 'string' && id) rows.push({ id })
  }
  if (rows.length === 0 && payload && Array.isArray(payload.models)) {
    for (const row of payload.models) {
      const id = typeof row === 'string' ? row : row && row.id
      if (typeof id === 'string' && id) rows.push({ id })
    }
  }
  return rows
}

export function parseModelInfo(payload) {
  const rows = payload && Array.isArray(payload.data) ? payload.data : []
  const byId = new Map()
  for (const row of rows) {
    const id = row && (row.model_name || row.model_info && row.model_info.id || row.id)
    if (typeof id !== 'string' || !id) continue
    const info = row.model_info && typeof row.model_info === 'object' ? row.model_info : {}
    const params = row.litellm_params && typeof row.litellm_params === 'object' ? row.litellm_params : {}
    const fields = dshModelFields(id, info)
    const record = {
      id,
      contextWindow: fields.contextWindow,
      maxTokens: fields.maxTokens,
      input: fields.input,
      reasoningEfforts: fields.reasoningEfforts,
      thinkingFormat: fields.thinkingFormat,
      reasoningSource: fields.reasoningSource,
      supportsReasoning: fields.supportsReasoning,
      defaultReasoningEffort: fields.defaultReasoningEffort,
      thinkingAlwaysOn: fields.thinkingAlwaysOn,
      inputCostPerToken: numberOrNull(info.input_cost_per_token),
      outputCostPerToken: numberOrNull(info.output_cost_per_token),
      attributes: collectAttributes(info, params),
    }
    if (fields.input) record.supportsVision = fields.input.includes('image')
    byId.set(id, record)
  }
  return byId
}

export function mergeCatalog(listPayload, infoPayload) {
  const listed = parseModelList(listPayload)
  const info = parseModelInfo(infoPayload)
  const seen = new Set()
  const catalog = []
  for (const row of listed) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    catalog.push({ id: row.id, ...info.get(row.id) })
  }
  for (const row of info.values()) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    catalog.push(row)
  }
  catalog.sort((a, b) => a.id.localeCompare(b.id))
  return catalog
}

export function bearerHeaders(apiKey) {
  const headers = { accept: 'application/json' }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  return headers
}

export async function pingGateway(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
  const root = normalizeBaseUrl(baseUrl)
  const response = await fetchImpl(`${root}/v1/models`, { headers: bearerHeaders(apiKey) })
  return { ok: response.ok, status: response.status }
}

export async function fetchCatalog(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
  const root = normalizeBaseUrl(baseUrl)
  const headers = bearerHeaders(apiKey)
  const modelsResponse = await fetchImpl(`${root}/v1/models`, { headers })
  if (!modelsResponse.ok) {
    rejectGateway(
      modelsResponse,
      '拉取模型失败',
      `网关拒绝了这把钥匙（HTTP ${modelsResponse.status}）。请填写发给你的 Virtual Key，不要填写 Master Key 或 Salt Key。`,
    )
  }
  const models = await modelsResponse.json()
  let info = null
  try {
    const infoResponse = await fetchImpl(`${root}/model/info`, { headers })
    if (infoResponse.ok) info = await infoResponse.json()
  } catch {
    info = null
  }
  return mergeCatalog(models, info)
}

export function parseGatewayMcp(payload) {
  const rows = Array.isArray(payload) ? payload : []
  const servers = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const serverName = String(row.server_name || row.alias || '').trim()
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(serverName)) continue
    const rawTransport = String(row.transport || '').toLowerCase()
    const transport = rawTransport === 'stdio' ? 'stdio' : 'streamable-http'
    const auth = String(row.auth_type || 'none').toLowerCase()
    const needsCredential = auth !== '' && auth !== 'none' && auth !== 'null'
    const item = {
      serverName,
      transport,
      needsCredential,
      description: String(row.description || '').slice(0, 240),
    }
    if (transport === 'stdio') {
      item.command = typeof row.command === 'string' ? row.command : ''
      item.args = Array.isArray(row.args) ? row.args.filter(part => typeof part === 'string').join(' ') : ''
    } else {
      item.url = typeof row.url === 'string' ? row.url : ''
    }
    servers.push(item)
  }
  return servers
}

export function parseSkillHub(payload) {
  const plugins = payload && Array.isArray(payload.plugins) ? payload.plugins : []
  return plugins.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const source = row.source && typeof row.source === 'object' ? row.source : {}
    const url = typeof source.url === 'string' ? source.url : ''
    const name = typeof row.name === 'string' ? row.name : ''
    if (!name || !url) return []
    const sourceKind = String(source.source || '')
    return [{
      name,
      description: String(row.description || '').slice(0, 240),
      url,
      path: typeof source.path === 'string' ? source.path : '',
      kind: sourceKind.startsWith('git') ? 'git' : 'http',
    }]
  })
}

export function toGatewayServer(row, baseUrl) {
  const parsed = parseGatewayMcp([row])[0]
  if (!parsed) return null
  const root = normalizeBaseUrl(baseUrl)
  return {
    serverName: parsed.serverName,
    transport: 'streamable-http',
    url: `${root}/${encodeURIComponent(parsed.serverName)}/mcp`,
    viaGateway: true,
    needsCredential: parsed.needsCredential === true,
    description: parsed.description,
  }
}

export async function fetchGatewayMcp(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
  const root = normalizeBaseUrl(baseUrl)
  const response = await fetchImpl(`${root}/v1/mcp/server`, { headers: bearerHeaders(apiKey) })
  if (!response.ok) {
    rejectGateway(
      response,
      '读取 MCP 失败',
      `网关没有把 MCP 授权给这把钥匙（HTTP ${response.status}）。请管理员在这把 Virtual Key 上勾选要分发的服务器。`,
    )
  }
  const payload = await response.json()
  const rows = Array.isArray(payload) ? payload : []
  return rows.map(row => toGatewayServer(row, root)).filter(Boolean)
}

export async function fetchSkillHub(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
  const root = normalizeBaseUrl(baseUrl)
  const headers = bearerHeaders(apiKey)
  const granted = await fetchImpl(`${root}/claude-code/plugins`, { headers })
  if (granted.ok) return parseSkillHub(await granted.json())
  if (granted.status !== 404) {
    rejectGateway(
      granted,
      '读取 Skill Hub 失败',
      `网关没有把技能授权给这把钥匙（HTTP ${granted.status}）。公开技能无需管理员钥匙；未公开的技能要管理员勾到这把 Virtual Key 上。`,
    )
  }
  const fallback = await fetchImpl(`${root}/public/skill_hub`, { headers })
  if (!fallback.ok) rejectGateway(fallback, '读取 Skill Hub 失败')
  return parseSkillHub(await fallback.json())
}

export function parseSpendLogs(payload) {
  const rows = Array.isArray(payload) ? payload
    : payload && Array.isArray(payload.data) ? payload.data
      : payload && Array.isArray(payload.logs) ? payload.logs
        : []
  return rows.map(normalizeSpendRow).filter(Boolean)
}

export function normalizeSpendRow(row) {
  if (!row || typeof row !== 'object') return null
  const spend = numberOrNull(row.spend ?? row.cost ?? row.response_cost)
  const prompt = numberOrNull(row.prompt_tokens ?? row.input_tokens) || 0
  const completion = numberOrNull(row.completion_tokens ?? row.output_tokens) || 0
  const total = numberOrNull(row.total_tokens) ?? (prompt + completion)
  const at = row.startTime || row.start_time || row.created_at || row.request_time || null
  return {
    requestId: stringOrNull(row.request_id || row.requestId || row.id),
    model: stringOrNull(row.model || row.model_group) || '未知模型',
    spend: spend ?? 0,
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: total,
    at: typeof at === 'string' ? at : at instanceof Date ? at.toISOString() : null,
    user: stringOrNull(row.user || row.end_user || row.end_user_id),
    metadata: row.metadata ?? row.request_tags ?? null,
  }
}

export async function fetchSpend(baseUrl, apiKey, range, fetchImpl = globalThis.fetch) {
  const root = normalizeBaseUrl(baseUrl)
  const headers = bearerHeaders(apiKey)
  const params = new URLSearchParams()
  if (range.start) params.set('start_date', range.start)
  if (range.end) params.set('end_date', nextUtcDay(range.end))
  if (apiKey) params.set('api_key', apiKey)
  params.set('summarize', 'false')
  const query = params.toString()
  const paths = [`/spend/logs?${query}`]
  let lastError = null
  for (const path of paths) {
    const response = await fetchImpl(`${root}${path}`, { headers })
    if (response.status === 404) continue
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        let detail = ''
        try {
          const payload = await response.json()
          detail = payload && payload.detail ? String(payload.detail) : ''
        } catch {
          detail = ''
        }
        const blocked = detail.includes('allowed to call')
        rejectGateway(
          response,
          '读取花费失败',
          blocked
            ? '这把 Virtual Key 的允许路由里没有花费接口。请管理员编辑这把钥匙，在 Allowed Routes 加上 spend_tracking_routes。钥匙本身没有失效，只是不能读花费。'
            : `这把钥匙不能读取花费（HTTP ${response.status}）。`,
        )
      }
      lastError = httpError(`读取花费失败：HTTP ${response.status}`)
      continue
    }
    return parseSpendLogs(await response.json())
  }
  throw lastError || httpError('网关没有 spend logs 接口')
}

export function mergeProvider(inherited, current, spec) {
  const providerId = assertProviderId(spec.providerId)
  const baseUrl = normalizeBaseUrl(spec.baseUrl)
  const modelIds = [...new Set((spec.modelIds || []).filter(id => typeof id === 'string' && id))]
  const base = { ...(inherited || {}), ...(current || {}) }
  const providers = {
    ...(inherited && inherited.providers || {}),
    ...(current && current.providers || {}),
  }
  if (modelIds.length === 0) {
    delete providers[providerId]
    return { ...base, providers }
  }
  const prev = providers[providerId] && typeof providers[providerId] === 'object' ? providers[providerId] : {}
  const prevModels = Array.isArray(prev.models) ? prev.models : []
  providers[providerId] = {
    ...prev,
    api: prev.api || 'openai-completions',
    baseURL: baseUrl,
    apiKeyEnv: KEY_ENV,
    displayName: prev.displayName || 'LiteLLM',
    compat: {
      supportsDeveloperRole: false,
      maxTokensField: 'max_tokens',
      ...(prev.compat || {}),
    },
    models: modelIds.map(id => materializeModel(id, prevModels, spec.models)),
  }
  return { ...base, providers }
}

export function presentModel(row) {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id) return row
  const fields = dshModelFields(row.id, row)
  return {
    ...row,
    contextWindow: fields.contextWindow,
    maxTokens: fields.maxTokens,
    input: fields.input,
    reasoningEfforts: fields.reasoningEfforts,
    thinkingFormat: fields.thinkingFormat,
    reasoningSource: fields.reasoningSource,
  }
}

export function providerSnippet(spec) {
  const providerId = assertProviderId(spec.providerId)
  const baseUrl = normalizeBaseUrl(spec.baseUrl)
  const listed = (spec.modelIds || []).filter(id => typeof id === 'string' && id)
  if (listed.length === 0) {
    return [
      `# 去掉供应商 ${providerId}`,
      '# DSH 不接受一个没有模型的自定义供应商。从 providers 里删掉这一条，不要写成 models: [].',
    ].join('\n')
  }
  const models = listed.map(id => modelYaml(id, spec.models)).join('\n')
  return [
    '- id: llm-pi-ai',
    '  config:',
    '    providers:',
    `      ${providerId}:`,
    '        displayName: LiteLLM',
    `        apiKeyEnv: ${KEY_ENV}`,
    '        api: openai-completions',
    `        baseURL: ${yamlScalar(baseUrl)}`,
    '        compat:',
    '          supportsDeveloperRole: false',
    '          maxTokensField: max_tokens',
    '        models:',
    models || '          []',
  ].join('\n')
}

export async function applyProvider(editor, spec) {
  const yaml = providerSnippet(spec)
  if (!editor || typeof editor.entries !== 'function' || typeof editor.edit !== 'function') {
    return { applied: false, reason: '这个配置档没有 configEditor，下面的片段可以贴进 cordis.patch.yml', yaml }
  }
  const entries = editor.entries() || []
  const entry = entries.find(item => item && item.options && item.options.id === 'llm-pi-ai')
  if (!entry) return { applied: false, reason: '没有找到 llm-pi-ai 这一条，模型供应商没有写入', yaml }
  await editor.edit(entry, (current, inherited) => mergeProvider(inherited, current, spec))
  return { applied: true, yaml }
}

function yamlScalar(value) {
  const text = String(value)
  if (/^[A-Za-z0-9_./:-]+$/.test(text)) return text
  return JSON.stringify(text)
}

function materializeModel(id, prevModels, catalog) {
  const previous = prevModels.find(model => model && model.id === id)
  const info = Array.isArray(catalog) ? catalog.find(row => row && row.id === id) : null
  const model = previous ? { ...previous, id } : { id }
  if (!info) return model
  const fields = dshModelFields(id, info)
  if (fields.contextWindow) model.contextWindow = fields.contextWindow
  if (fields.maxTokens) model.maxTokens = fields.maxTokens
  if (fields.input) model.input = fields.input
  else delete model.input
  if (fields.reasoningEfforts === false || isEffortMap(fields.reasoningEfforts)) model.reasoningEfforts = fields.reasoningEfforts
  else delete model.reasoningEfforts
  if (fields.thinkingFormat) {
    const compat = model.compat && typeof model.compat === 'object' ? model.compat : {}
    model.compat = { ...compat, thinkingFormat: fields.thinkingFormat }
  } else if (model.compat && typeof model.compat === 'object') {
    const compat = { ...model.compat }
    delete compat.thinkingFormat
    if (Object.keys(compat).length === 0) delete model.compat
    else model.compat = compat
  }
  return model
}

const LITELLM_EFFORTS = [
  ['none', 'off', 'supports_none_reasoning_effort'],
  ['minimal', 'minimal', 'supports_minimal_reasoning_effort'],
  ['low', 'low', 'supports_low_reasoning_effort'],
  ['medium', 'medium', 'supports_medium_reasoning_effort'],
  ['high', 'high', 'supports_high_reasoning_effort'],
  ['xhigh', 'xhigh', 'supports_xhigh_reasoning_effort'],
  ['max', 'max', 'supports_max_reasoning_effort'],
]
const EFFORT_LEVELS = LITELLM_EFFORTS.map(([, level]) => level)
const KNOWN_EFFORT = new Map(LITELLM_EFFORTS.map(([name, level]) => [name, level]))
const DEFAULT_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])

export function dshModelFields(id, info = {}) {
  const source = info && typeof info === 'object' ? info : {}
  const contextWindow = positiveInt(source.contextWindow)
    ?? positiveInt(source.max_input_tokens)
    ?? positiveInt(source.context_window)
  const maxTokens = positiveInt(source.maxTokens) ?? positiveInt(source.max_output_tokens)
  return {
    contextWindow,
    maxTokens,
    input: inputOf(source),
    ...reasoningOf(source),
  }
}

function inputOf(source) {
  const vision = triState(source, 'supports_vision', 'supportsVision')
  const image = triState(source, 'supports_image_input', 'supportsImageInput')
  if (vision === true || image === true) return ['text', 'image']
  if (vision === false || image === false) return ['text']
  return storedInput(source.input)
}

function storedInput(value) {
  if (!Array.isArray(value) || value.length === 0) return null
  const items = value.filter(item => item === 'text' || item === 'image')
  if (items.length !== value.length) return null
  if (items.includes('image')) return ['text', 'image']
  if (items.includes('text')) return ['text']
  return null
}

function reasoningOf(source) {
  if (source.reasoningSource === 'inferred') {
    return {
      reasoningEfforts: null,
      thinkingFormat: null,
      reasoningSource: null,
      supportsReasoning: null,
      defaultReasoningEffort: null,
      thinkingAlwaysOn: null,
    }
  }
  const kept = source.reasoningSource === 'gateway' && (source.reasoningEfforts === false || isEffortMap(source.reasoningEfforts))
    ? source.reasoningEfforts
    : null
  const fromGateway = explicitEfforts(source)
  const reasoningEfforts = fromGateway || kept
  const supportsReasoning = triState(source, 'supports_reasoning', 'supportsReasoning')
  if (!reasoningEfforts && supportsReasoning === false) {
    return reasoningResult(false, source, supportsReasoning)
  }
  return reasoningResult(reasoningEfforts, source, supportsReasoning)
}

function explicitEfforts(source) {
  if (Array.isArray(source.reasoning_effort_levels)) {
    const efforts = {}
    for (const name of source.reasoning_effort_levels) {
      if (typeof name !== 'string') continue
      const level = KNOWN_EFFORT.get(name.toLowerCase())
      if (!level) continue
      efforts[level] = name.toLowerCase() === 'none' ? 'none' : name.toLowerCase()
    }
    return isEffortMap(efforts) ? efforts : null
  }
  const efforts = {}
  for (const [name, level, flag] of LITELLM_EFFORTS) {
    if (source[flag] === true) efforts[level] = name === 'none' ? 'none' : name
  }
  return isEffortMap(efforts) ? efforts : null
}

function reasoningResult(reasoningEfforts, source, supportsReasoning) {
  const declared = reasoningEfforts === false || isEffortMap(reasoningEfforts)
  return {
    reasoningEfforts: declared ? reasoningEfforts : null,
    thinkingFormat: null,
    reasoningSource: declared || supportsReasoning !== null ? 'gateway' : null,
    supportsReasoning,
    defaultReasoningEffort: defaultEffort(source),
    thinkingAlwaysOn: triState(source, 'thinking_always_on', 'thinkingAlwaysOn'),
  }
}

function defaultEffort(source) {
  const value = source.default_reasoning_effort ?? source.defaultReasoningEffort
  return typeof value === 'string' && DEFAULT_EFFORTS.has(value) ? value : null
}

function triState(source, rawKey, storedKey) {
  if (source[rawKey] === true || source[storedKey] === true) return true
  if (source[rawKey] === false || source[storedKey] === false) return false
  return null
}

function isEffortMap(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
}

function modelYaml(id, catalog) {
  const info = Array.isArray(catalog) ? catalog.find(row => row && row.id === id) : null
  const lines = [`          - id: ${yamlScalar(id)}`]
  if (!info) return lines.join('\n')
  const fields = dshModelFields(id, info)
  if (fields.contextWindow) lines.push(`            contextWindow: ${fields.contextWindow}`)
  if (fields.maxTokens) lines.push(`            maxTokens: ${fields.maxTokens}`)
  if (fields.input) lines.push(`            input: [${fields.input.join(', ')}]`)
  if (fields.thinkingFormat) {
    lines.push('            compat:')
    lines.push(`              thinkingFormat: ${fields.thinkingFormat}`)
  }
  if (fields.reasoningEfforts === false) {
    lines.push('            reasoningEfforts: false')
  } else if (isEffortMap(fields.reasoningEfforts)) {
    lines.push('            reasoningEfforts:')
    for (const level of EFFORT_LEVELS) {
      if (!Object.prototype.hasOwnProperty.call(fields.reasoningEfforts, level)) continue
      const wire = fields.reasoningEfforts[level]
      lines.push(wire == null ? `              ${level}:` : `              ${level}: ${yamlScalar(wire)}`)
    }
  }
  return lines.join('\n')
}

function positiveInt(value) {
  return Number.isInteger(value) && value > 0 ? value : null
}

function nextUtcDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

const ATTRIBUTE_KEYS = [
  'description',
  'mode',
  'max_input_tokens',
  'max_output_tokens',
  'max_tokens',
  'supports_vision',
  'supports_image_input',
  'supports_function_calling',
  'supports_tool_choice',
  'supports_reasoning',
  'reasoning_effort_levels',
  'supports_none_reasoning_effort',
  'supports_minimal_reasoning_effort',
  'supports_low_reasoning_effort',
  'supports_medium_reasoning_effort',
  'supports_high_reasoning_effort',
  'supports_xhigh_reasoning_effort',
  'supports_max_reasoning_effort',
  'default_reasoning_effort',
  'thinking_always_on',
  'input_cost_per_token',
  'output_cost_per_token',
  'cache_read_input_token_cost',
  'cache_creation_input_token_cost',
]

function collectAttributes(info, params) {
  const rows = []
  for (const key of ATTRIBUTE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(info, key)) continue
    const value = plainAttribute(info[key])
    if (value === undefined) continue
    rows.push({ key, value })
  }
  for (const key of ['model', 'custom_llm_provider']) {
    const value = plainAttribute(params[key])
    if (value === undefined) continue
    rows.push({ key: `litellm_params.${key}`, value })
  }
  return rows
}

function plainAttribute(value) {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value) && value.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
    return value.slice()
  }
  return undefined
}

function numberOrNull(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof number === 'number' && Number.isFinite(number) ? number : null
}

function stringOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function rejectGateway(response, what, hint) {
  if (response.status === 401 || response.status === 403) {
    throw httpError(hint || `网关拒绝了这把钥匙（HTTP ${response.status}）。请填写发给你的 Virtual Key。`)
  }
  throw httpError(`${what}：HTTP ${response.status}`)
}

function httpError(message) {
  return Object.assign(new Error(message), { status: 400 })
}
