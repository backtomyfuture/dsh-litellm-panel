/**
 * Plugin state lives beside DSH, not inside cordis.patch.yml.
 * The key file is separate and mode 0600. State never contains it.
 */
import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export const STATE_VERSION = 1

export function defaultState() {
  return {
    version: STATE_VERSION,
    observeModelCalls: true,
    litellm: {
      baseUrl: 'http://127.0.0.1:4000',
      providerId: 'litellm',
      enabled: true,
      enabledModelIds: [],
      catalog: [],
      syncedAt: null,
    },
    mcpServers: [],
    hub: [],
  }
}

export function resolveHome(env = process.env) {
  return env.DSH_HOME || path.join(homedir(), '.dsh')
}

function queue() {
  let chain = Promise.resolve()
  return function locked(fn) {
    const run = chain.then(fn, fn)
    chain = run.then(() => {}, () => {})
    return run
  }
}

async function writePrivate(file, text) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  await writeFile(tmp, text, { mode: 0o600 })
  await rename(tmp, file)
  await chmod(file, 0o600)
}

export function createStore(rootDir) {
  const dir = path.join(rootDir, 'resource-center')
  const stateFile = path.join(dir, 'state.json')
  const keyFile = path.join(dir, 'litellm.key')
  const traceFile = path.join(dir, 'traces.jsonl')
  const locked = queue()

  async function readState() {
    try {
      const raw = await readFile(stateFile, 'utf8')
      const parsed = JSON.parse(raw)
      return normalizeState(parsed)
    } catch (err) {
      if (err && err.code === 'ENOENT') return defaultState()
      if (err instanceof SyntaxError) return defaultState()
      throw err
    }
  }

  return {
    dir,
    stateFile,
    keyFile,
    traceFile,
    read: () => locked(readState),
    update(change) {
      return locked(async () => {
        const current = await readState()
        const next = normalizeState(await change(current))
        await writePrivate(stateFile, `${JSON.stringify(next, null, 2)}\n`)
        return next
      })
    },
    async readKey() {
      try {
        const text = (await readFile(keyFile, 'utf8')).trim()
        return text || null
      } catch (err) {
        if (err && err.code === 'ENOENT') return null
        throw err
      }
    },
    writeKey(key) {
      return locked(async () => {
        const trimmed = String(key || '').trim()
        if (!trimmed) {
          const { rm } = await import('node:fs/promises')
          await rm(keyFile, { force: true })
          return false
        }
        await writePrivate(keyFile, `${trimmed}\n`)
        return true
      })
    },
    appendTrace(row) {
      return locked(async () => {
        await mkdir(dir, { recursive: true, mode: 0o700 })
        const { appendFile } = await import('node:fs/promises')
        await appendFile(traceFile, `${JSON.stringify(row)}\n`, { mode: 0o600 })
        await chmod(traceFile, 0o600)
      })
    },
    async readTraces(limit = 2000) {
      try {
        const raw = await readFile(traceFile, 'utf8')
        const lines = raw.split('\n').filter(Boolean)
        return lines.slice(-limit).map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        }).filter(Boolean)
      } catch (err) {
        if (err && err.code === 'ENOENT') return []
        throw err
      }
    },
  }
}

export function normalizeState(input) {
  const base = defaultState()
  const source = input && typeof input === 'object' ? input : {}
  const litellm = source.litellm && typeof source.litellm === 'object' ? source.litellm : {}
  return {
    version: STATE_VERSION,
    observeModelCalls: source.observeModelCalls !== false,
    litellm: {
      baseUrl: typeof litellm.baseUrl === 'string' && litellm.baseUrl ? litellm.baseUrl : base.litellm.baseUrl,
      providerId: typeof litellm.providerId === 'string' && litellm.providerId ? litellm.providerId : base.litellm.providerId,
      enabled: litellm.enabled !== false,
      enabledModelIds: stringList(litellm.enabledModelIds),
      catalog: Array.isArray(litellm.catalog) ? litellm.catalog.filter(isCatalogRow) : [],
      syncedAt: typeof litellm.syncedAt === 'string' ? litellm.syncedAt : null,
    },
    mcpServers: Array.isArray(source.mcpServers) ? source.mcpServers.filter(isServerDraft) : [],
    hub: Array.isArray(source.hub) ? source.hub.filter(isHubRow) : [],
  }
}

function stringList(value) {
  if (!Array.isArray(value)) return []
  return value.filter(item => typeof item === 'string' && item.length > 0)
}

function isCatalogRow(row) {
  return !!row && typeof row === 'object' && typeof row.id === 'string'
}

function isServerDraft(row) {
  return !!row && typeof row === 'object' && typeof row.serverName === 'string'
}

function isHubRow(row) {
  return !!row && typeof row === 'object' && typeof row.name === 'string'
}

export const KEY_ENV = 'DSH_LITELLM_KEY'

export function publishKey(key, env = process.env, options = {}) {
  if (!key) return false
  if (env[KEY_ENV] && !options.force) return false
  env[KEY_ENV] = key
  return true
}
