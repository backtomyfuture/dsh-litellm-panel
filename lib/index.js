/**
 * Host half. Loopback routes serve the sidebar page.
 * Enabled MCP rows mount @deepseek-ai/dsh-mcp-client as child plugins.
 */
import { createSupervisor, denyReason, loadMcpPlugin } from './mcp.js'
import { createHandler, ROUTE_PATH } from './routes.js'
import { observeModelCall, skillNameFromArgs } from './spend.js'
import { createStore, KEY_ENV, publishKey, resolveHome } from './store.js'

export const name = 'dsh-litellm-panel'
export const inject = ['webServer', 'configEditor', 'tools', 'credentials']

export function apply(ctx, config = {}) {
  const home = typeof config.dshHome === 'string' && config.dshHome ? config.dshHome : resolveHome()
  if (config.dshHome !== undefined && typeof config.dshHome !== 'string') {
    throw new Error('dsh-litellm-panel: dshHome must be a string')
  }
  const store = createStore(home)
  const runtime = { observe: true, servers: [] }
  const supervisor = createSupervisor({
    start: async (mcpConfig) => {
      const plugin = await loadMcpPlugin()
      if (!ctx || typeof ctx.plugin !== 'function') throw new Error('当前宿主不能挂载子插件')
      return ctx.plugin(plugin, mcpConfig)
    },
  })
  const deps = {
    store,
    supervisor,
    home,
    cwd: config.projectRoot,
    projectRoot: typeof config.projectRoot === 'string' ? config.projectRoot : undefined,
    editor: null,
    guard: null,
    fetch: globalThis.fetch,
    async onKey(key) {
      publishKey(key, process.env, { force: true })
      try {
        if (ctx && ctx.credentials && typeof ctx.credentials.set === 'function') {
          await ctx.credentials.set(KEY_ENV, key)
        }
      } catch (err) {
        warn(ctx, err)
      }
    },
    touch(state) {
      runtime.servers = state.mcpServers
      runtime.observe = state.observeModelCalls !== false
    },
  }

  const refreshGuardSource = async () => {
    const state = await store.read()
    runtime.observe = state.observeModelCalls
    runtime.servers = state.mcpServers
    return state
  }

  const registerRoute = (server) => {
    if (!server || typeof server.register !== 'function') return undefined
    const dispose = server.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: createHandler({
        ...deps,
        get editor() {
          if (!ctx) return null
          try {
            return ctx.configEditor || null
          } catch {
            return null
          }
        },
      }),
    })
    return () => {
      try {
        if (typeof dispose === 'function') dispose()
      } catch {
        // Unregister is best-effort.
      }
    }
  }

  const arm = () => {
    let stopRoute = () => {}
    let stopEvents = () => {}
    let stopGuard = () => {}
    try {
      if (ctx && typeof ctx.tools?.guard === 'function') {
        deps.guard = true
        const dispose = ctx.tools.guard(execution => denyReason(runtime.servers, execution))
        if (typeof dispose === 'function') {
          let spent = false
          stopGuard = () => {
            if (spent) return
            spent = true
            dispose()
          }
        }
      }
    } catch (err) {
      warn(ctx, err)
    }
    try {
      if (ctx && typeof ctx.on === 'function') {
        const dispose = ctx.on('llm/stream', (options, next) => {
          if (runtime.observe) rememberCall(store, options)
          return typeof next === 'function' ? next() : undefined
        })
        const disposeSkill = ctx.on('tools/result', (execution, next) => {
          if (runtime.observe) rememberSkill(store, execution)
          return typeof next === 'function' ? next() : undefined
        })
        stopEvents = () => {
          if (typeof dispose === 'function') dispose()
          if (typeof disposeSkill === 'function') disposeSkill()
          stopGuard()
        }
      }
    } catch (err) {
      warn(ctx, err)
    }
    let disposed = false
    const boot = refreshGuardSource()
      .then(async (state) => {
        const key = await store.readKey()
        if (key) await deps.onKey(key)
        if (disposed) return
        if (state.litellm.enabled !== false) await supervisor.reconcile(state.mcpServers)
        if (disposed) await supervisor.stopAll()
      })
      .catch(err => warn(ctx, err))
    if (ctx && typeof ctx.effect === 'function') {
      ctx.effect(() => () => {
        disposed = true
        stopRoute()
        stopEvents()
        stopGuard()
        supervisor.stopAll().catch(err => warn(ctx, err))
      })
    }
    void boot
    return { boot, setRoute(dispose) { stopRoute = dispose || (() => {}) } }
  }

  let started
  try {
    started = arm()
  } catch (err) {
    warn(ctx, err)
    started = { setRoute() {} }
  }
  const attach = (server) => {
    try {
      const dispose = registerRoute(server)
      started.setRoute(dispose)
      return dispose
    } catch (err) {
      warn(ctx, err)
      return undefined
    }
  }
  if (ctx && ctx.webServer && typeof ctx.effect === 'function') {
    ctx.effect(() => attach(ctx.webServer), 'dsh-litellm-panel: route')
    return
  }
  if (ctx && typeof ctx.inject === 'function') {
    try {
      ctx.inject(['webServer'], (ready) => attach(ready && ready.webServer))
    } catch (err) {
      warn(ctx, err)
    }
  }
}

function rememberCall(store, options) {
  const row = observeModelCall(options)
  if (!row) return
  store.appendTrace({ kind: 'model', ...row }).catch(() => {})
}

function rememberSkill(store, execution) {
  if (!execution || execution.name !== 'skill') return
  const skill = skillNameFromArgs(execution.arguments)
  if (!skill) return
  const sessionId = execution.agent && (execution.agent.sessionId || execution.agent.session && execution.agent.session.id)
  store.appendTrace({
    kind: 'skill',
    skill,
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    at: new Date().toISOString(),
  }).catch(() => {})
}

function warn(ctx, err) {
  const logger = ctx && ctx.logger
  const sink = (logger && (logger.warn || logger.info)) || console.warn
  try {
    sink.call(logger || console, `[dsh-litellm-panel] ${err instanceof Error ? err.message : String(err)}`)
  } catch {
    // A log failure must not stop the host.
  }
}
