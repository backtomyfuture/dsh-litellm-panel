/**
 * MCP server records, hot mount supervisor, tool deny guard, and a short probe.
 * Mounting uses the host's @deepseek-ai/dsh-mcp-client. The probe is a separate
 * connectivity check and does not replace that connection.
 */
import { spawn } from 'node:child_process'
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

export function splitArgs(input) {
  if (Array.isArray(input)) return input.map(item => String(item))
  const source = String(input || '')
  const out = []
  let current = ''
  let quote = ''
  for (const char of source) {
    if (quote) {
      if (char === quote) quote = ''
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === ' ' || char === '\n' || char === '\t') {
      if (current) {
        out.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (quote) throw Object.assign(new Error('引号没有闭合'), { status: 400 })
  if (current) out.push(current)
  return out
}

export function parseEnvLines(text) {
  const env = {}
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) throw Object.assign(new Error('环境变量要写成 KEY=value'), { status: 400 })
    const key = trimmed.slice(0, index).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw Object.assign(new Error(`环境变量名不合法：${key}`), { status: 400 })
    env[key] = trimmed.slice(index + 1)
  }
  return env
}

export function parseHeaderLines(text) {
  const headers = {}
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const index = trimmed.indexOf(':')
    if (index <= 0) throw Object.assign(new Error('请求头要写成 Name: value'), { status: 400 })
    headers[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
  }
  return headers
}

export function mergeSecretMap(previous, text, parse) {
  const incoming = text == null || String(text).trim() === '' ? null : parse(text)
  if (!incoming) return { ...(previous || {}) }
  const next = { ...(previous || {}) }
  for (const [key, value] of Object.entries(incoming)) {
    if (value === '') delete next[key]
    else next[key] = value
  }
  return next
}

export function normalizeServer(input, previous) {
  if (!input || typeof input !== 'object') throw Object.assign(new Error('缺少服务器'), { status: 400 })
  const serverName = String(input.serverName || '').trim()
  if (!SERVER_NAME.test(serverName)) throw Object.assign(new Error('服务器名要是 1 到 32 位字母、数字、下划线或连字符'), { status: 400 })
  const transport = input.transport === 'stdio' ? 'stdio' : input.transport === 'streamable-http' ? 'streamable-http' : null
  if (!transport) throw Object.assign(new Error('传输方式要是 stdio 或 streamable-http'), { status: 400 })
  const prev = previous && previous.serverName === serverName ? previous : (previous || {})
  const disabledTools = Array.isArray(input.disabledTools)
    ? input.disabledTools.filter(name => typeof name === 'string' && name)
    : (prev.disabledTools || [])
  const server = {
    serverName,
    transport,
    enabled: input.enabled !== false,
    disabledTools,
  }
  if (transport === 'stdio') {
    const command = String(input.command || '').trim()
    if (!command || /[\n\r]/.test(command)) throw Object.assign(new Error('stdio 需要一个命令'), { status: 400 })
    server.command = command
    server.args = splitArgs(input.args ?? prev.args ?? [])
    server.env = mergeSecretMap(prev.env, input.envText, parseEnvLines)
    const cwd = String(input.cwd ?? prev.cwd ?? '').trim()
    if (cwd) server.cwd = cwd
  } else {
    let url
    try {
      url = new URL(String(input.url || '').trim())
    } catch {
      throw Object.assign(new Error('HTTP 端点不是合法地址'), { status: 400 })
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw Object.assign(new Error('HTTP 端点只接受 http 或 https'), { status: 400 })
    server.url = url.toString()
    server.headers = mergeSecretMap(prev.headers, input.headerText, parseHeaderLines)
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
  if (server.transport === 'stdio') {
    return {
      serverName: server.serverName,
      transport: 'stdio',
      command: server.command,
      args: server.args || [],
      env: server.env || {},
      ...(server.cwd ? { cwd: server.cwd } : {}),
      failOnStartupError: false,
    }
  }
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
    command: server.command || null,
    args: server.args || [],
    cwd: server.cwd || null,
    url: server.url ? redactUrl(server.url) : null,
    viaGateway: server.viaGateway === true,
    envKeys: Object.keys(server.env || {}),
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
  if (server.transport === 'streamable-http') return probeHttp(server, timeoutMs, options.fetchImpl)
  return probeStdio(server, timeoutMs, options.spawnImpl)
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

function probeStdio(server, timeoutMs, spawnImpl = spawn) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(server.command, server.args || [], {
      cwd: server.cwd || undefined,
      env: scrubbedEnv(server.env),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const messages = []
    let buffer = Buffer.alloc(0)
    let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 300).unref?.()
      if (error) reject(error)
      else resolve(value)
    }
    const timer = setTimeout(() => finish(new Error('连接超时')), timeoutMs)
    child.on('error', err => finish(err))
    child.stderr.on('data', () => {})
    child.stdout.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      buffer = takeFrames(buffer, (message) => {
        messages.push(message)
        if (message.id === 2) finish(null, { ok: true, tools: toolRows(message.result || message) })
        if (message.id === 1 && message.error) finish(new Error(message.error.message || 'initialize 失败'))
      })
    })
    child.on('exit', (code) => {
      if (!settled) finish(new Error(`进程已退出（${code}）`))
    })
    const write = (message) => child.stdin.write(frame(message))
    write(rpc(1, 'initialize', initializeParams()))
    write({ jsonrpc: '2.0', method: 'notifications/initialized' })
    write(rpc(2, 'tools/list', {}))
  })
}

export function frame(message) {
  const body = Buffer.from(JSON.stringify(message))
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body])
}

export function takeFrames(buffer, onMessage) {
  let rest = buffer
  while (rest.length > 0) {
    const asText = rest.toString('utf8')
    const headerEnd = asText.indexOf('\r\n\r\n')
    if (headerEnd >= 0 && /^\s*Content-Length:/i.test(asText)) {
      const header = asText.slice(0, headerEnd)
      const match = /Content-Length:\s*(\d+)/i.exec(header)
      if (!match) break
      const length = Number(match[1])
      const start = Buffer.byteLength(header) + 4
      if (rest.length < start + length) break
      onMessage(JSON.parse(rest.subarray(start, start + length).toString('utf8')))
      rest = rest.subarray(start + length)
      continue
    }
    const newline = rest.indexOf(0x0a)
    if (newline < 0) break
    const line = rest.subarray(0, newline).toString('utf8').trim()
    rest = rest.subarray(newline + 1)
    if (!line) continue
    onMessage(JSON.parse(line))
  }
  return rest
}

function initializeParams() {
  return {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: 'dsh-resource-center', version: '0.1.0' },
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

export function scrubbedEnv(extra = {}) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (/KEY|PASSWORD|SECRET|TOKEN/i.test(key)) continue
    if (key.startsWith('DSH_')) continue
    env[key] = value
  }
  return { ...env, ...extra }
}
