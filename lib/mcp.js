/**
 * MCP server records, hot mount supervisor, tool deny guard, and a short probe.
 * Mounting uses the host's @deepseek-ai/dsh-mcp-client. The probe is a separate
 * connectivity check and does not replace that connection.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/

export function publicToolName(serverName, rawName) {
  return `mcp__${serverName}__${rawName}`
}

export function denyReason(servers, execution) {
  const name = execution && execution.name
  if (typeof name !== 'string') return undefined
  for (const server of servers) {
    if (!server || server.enabled === false) continue
    const disabled = new Set(server.disabledTools || [])
    if (disabled.size === 0) continue
    const prefix = `mcp__${server.serverName}__`
    if (!name.startsWith(prefix)) continue
    const raw = name.slice(prefix.length)
    if (disabled.has(raw) || disabled.has(name)) return `资源中心已关闭工具 ${raw}`
  }
  return undefined
}

export function normalizeServer(input, previous) {
  if (!input || typeof input !== 'object') throw Object.assign(new Error('缺少服务器'), { status: 400 })
  const serverName = String(input.serverName || '').trim()
  if (!SERVER_NAME.test(serverName)) throw Object.assign(new Error('服务器名要是 1 到 32 位字母、数字、下划线或连字符'), { status: 400 })
  const prev = previous && previous.serverName === serverName ? previous : (previous || {})
  const disabledTools = Array.isArray(input.disabledTools)
    ? input.disabledTools.filter(name => typeof name === 'string' && name)
    : (prev.disabledTools || [])
  let url
  try {
    url = new URL(String(input.url || '').trim())
  } catch {
    throw Object.assign(new Error('HTTP 端点不是合法地址'), { status: 400 })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw Object.assign(new Error('HTTP 端点只接受 http 或 https'), { status: 400 })
  const server = {
    serverName,
    transport: 'streamable-http',
    url: url.toString(),
    headers: { ...(prev.headers || {}) },
    enabled: input.enabled !== false,
    disabledTools,
  }
  if (input.viaGateway === true) server.viaGateway = true
  return server
}

export function withGatewayKey(server, key) {
  if (!server || server.viaGateway !== true) return server
  if (!key) throw Object.assign(new Error('还没有虚拟钥匙。先保存 Virtual Key，再加入网关上的 MCP。'), { status: 400 })
  return {
    ...server,
    headers: { ...(server.headers || {}), Authorization: `Bearer ${key}` },
  }
}

export function pluginConfig(server) {
  return {
    serverName: server.serverName,
    transport: 'streamable-http',
    url: server.url,
    headers: server.headers || {},
    failOnStartupError: false,
  }
}

export function redactServer(server, runtime = {}) {
  const status = runtime.status && runtime.status.get(server.serverName)
  return {
    serverName: server.serverName,
    transport: server.transport,
    enabled: server.enabled !== false,
    disabledTools: server.disabledTools || [],
    url: server.url ? redactUrl(server.url) : null,
    viaGateway: server.viaGateway === true,
    headerNames: Object.keys(server.headers || {}),
    runtime: status || { state: server.enabled === false ? 'stopped' : 'unknown' },
  }
}

export function redactUrl(input) {
  const url = new URL(input)
  url.username = ''
  url.password = ''
  for (const key of [...url.searchParams.keys()]) {
    if (/token|key|secret|password/i.test(key)) url.searchParams.set(key, '***')
  }
  return url.toString()
}

export function createSupervisor({ start }) {
  const running = new Map()
  const status = new Map()

  async function stop(serverName) {
    const current = running.get(serverName)
    running.delete(serverName)
    if (!current) return
    try {
      await current.dispose()
    } catch (err) {
      status.set(serverName, { state: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return {
    status,
    async reconcile(servers) {
      const wanted = new Set()
      for (const server of servers) {
        if (server.enabled === false) continue
        wanted.add(server.serverName)
        const config = pluginConfig(server)
        const signature = JSON.stringify(config)
        const current = running.get(server.serverName)
        if (current && current.signature === signature) continue
        await stop(server.serverName)
        try {
          const handle = await start(config)
          const dispose = handle && (handle.dispose || handle.stop)
          running.set(server.serverName, {
            signature,
            dispose: typeof dispose === 'function' ? () => dispose.call(handle) : async () => {},
          })
          status.set(server.serverName, { state: 'running' })
        } catch (err) {
          status.set(server.serverName, { state: 'error', message: err instanceof Error ? err.message : String(err) })
        }
      }
      for (const serverName of [...running.keys()]) {
        if (!wanted.has(serverName)) {
          await stop(serverName)
          status.set(serverName, { state: 'stopped' })
        }
      }
    },
    async stopAll() {
      for (const serverName of [...running.keys()]) {
        await stop(serverName)
      }
    },
  }
}

export function mcpClientUrl(argv = []) {
  const marker = 'app.asar'
  for (const arg of argv) {
    if (typeof arg !== 'string') continue
    const index = arg.indexOf(marker)
    if (index < 0) continue
    const after = arg[index + marker.length]
    if (after && after !== '/' && after !== '\\') continue
    const file = path.join(arg.slice(0, index + marker.length), 'dsh', 'node_modules', '@deepseek-ai', 'dsh-mcp-client', 'lib', 'index.js')
    return pathToFileURL(file).href
  }
  return null
}

function missingModule(err) {
  if (!err) return false
  if (err.code === 'ERR_MODULE_NOT_FOUND') return true
  return /Cannot find package/.test(err.message || '')
}

export async function loadMcpPlugin(importImpl = specifier => import(specifier), argv = process.argv) {
  let imported
  try {
    imported = await importImpl('@deepseek-ai/dsh-mcp-client')
  } catch (err) {
    const fallback = missingModule(err) ? mcpClientUrl(argv) : null
    if (!fallback) throw err
    imported = await importImpl(fallback)
  }
  const apply = imported && (imported.apply || (imported.default && imported.default.apply))
  if (typeof apply !== 'function') throw new Error('宿主里没有可用的 @deepseek-ai/dsh-mcp-client')
  return {
    name: imported.name || 'dsh-mcp-client',
    apply,
    ...(imported.inject ? { inject: imported.inject } : {}),
    ...(imported.Config ? { Config: imported.Config } : {}),
  }
}

const PROTOCOL = '2024-11-05'

export async function probeServer(server, options = {}) {
  const timeoutMs = options.timeoutMs || 8000
  return probeHttp(server, timeoutMs, options.fetchImpl)
}

async function probeHttp(server, timeoutMs, fetchImpl = globalThis.fetch) {
  let sessionId = null
  const post = async (message) => {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(server.headers || {}),
    }
    if (sessionId) headers['mcp-session-id'] = sessionId
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(server.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: controller.signal,
      })
      sessionId = response.headers.get('mcp-session-id') || sessionId
      const text = await response.text()
      if (!response.ok) throw new Error(`HTTP ${response.status}：${clip(text)}`)
      if (!text.trim()) return null
      const parsed = parseRpc(text)
      if (parsed && parsed.error) throw new Error(parsed.error.message || 'MCP 返回了错误')
      return parsed
    } finally {
      clearTimeout(timer)
    }
  }
  await post(rpc(1, 'initialize', initializeParams()))
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
  const listed = await post(rpc(2, 'tools/list', {}))
  const tools = toolRows(listed)
  return { ok: true, tools, notice: tools.length === 0 ? emptyToolNotice() : '' }
}

function initializeParams() {
  return {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: 'dsh-litellm-panel', version: '0.1.0' },
  }
}

function rpc(id, method, params) {
  return { jsonrpc: '2.0', id, method, params }
}

export function parseRpc(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
  const data = []
  for (const line of trimmed.split('\n')) {
    if (line.startsWith('data:')) data.push(line.slice(5).trim())
  }
  const json = data.filter(item => item && item !== '[DONE]').at(-1)
  if (!json) throw new Error(`无法解析 MCP 响应：${clip(trimmed)}`)
  return JSON.parse(json)
}

function emptyToolNotice() {
  return '网关没有返回工具。LiteLLM 连不上这个 MCP 的上游时，也会回一个空列表。'
}

function toolRows(message) {
  const result = message && message.result ? message.result : message
  const tools = result && Array.isArray(result.tools) ? result.tools : []
  return tools
    .filter(tool => tool && typeof tool.name === 'string')
    .map(tool => ({
      name: tool.name,
      description: typeof tool.description === 'string' ? tool.description.slice(0, 280) : '',
    }))
}

function clip(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 180)
}
