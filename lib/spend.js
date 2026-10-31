/**
 * Join LiteLLM spend rows with local model-call observations.
 * A skill name is the latest skill load in that session before the call.
 */

const MATCH_WINDOW_MS = 15000
const LOOSE_WINDOW_MS = 5000

export function skillNameFromArgs(args) {
  if (!args || typeof args !== 'object') return null
  for (const key of ['name', 'skill', 'skill_name', 'skillName']) {
    const value = args[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function observeModelCall(options) {
  if (!options || typeof options !== 'object') return null
  const sessionId = typeof options.sessionId === 'string' ? options.sessionId : null
  const model = typeof options.model === 'string' ? options.model : null
  if (!model && !sessionId) return null
  return {
    at: new Date().toISOString(),
    sessionId,
    model,
    purpose: typeof options.purpose === 'string' ? options.purpose : null,
  }
}

export function attributeSpend(logs, traces, skillMarks = []) {
  const usedTraces = new Set()
  const joined = logs.map((log) => {
    const match = matchLog(log, traces, usedTraces)
    const skill = match ? skillBefore(skillMarks, match.trace) : null
    return {
      ...log,
      sessionId: match && match.trace.sessionId || null,
      skill,
      match: match ? match.quality : 'none',
    }
  })
  return { rows: joined, summary: summarize(joined) }
}

export function summarize(rows) {
  const byModel = new Map()
  const bySkill = new Map()
  let spend = 0
  let tokens = 0
  let matched = 0
  for (const row of rows) {
    spend += row.spend || 0
    tokens += row.totalTokens || 0
    if (row.match && row.match !== 'none') matched += 1
    addBucket(byModel, row.model || '未知模型', row)
    if (row.skill) addBucket(bySkill, row.skill, row)
  }
  return {
    requests: rows.length,
    spend,
    tokens,
    matched,
    byModel: buckets(byModel),
    bySkill: buckets(bySkill),
  }
}

function matchLog(log, traces, used) {
  const when = Date.parse(log.at || '')
  let loose = null
  for (let index = 0; index < traces.length; index += 1) {
    if (used.has(index)) continue
    const trace = traces[index]
    if (log.requestId && trace.requestId && log.requestId === trace.requestId) {
      used.add(index)
      return { trace, quality: 'request' }
    }
    if (!Number.isFinite(when)) continue
    const delta = Math.abs(when - Date.parse(trace.at || ''))
    if (log.model && trace.model && log.model !== trace.model) continue
    if (trace.sessionId && metadataHas(log.metadata, trace.sessionId) && delta <= MATCH_WINDOW_MS) {
      used.add(index)
      return { trace, quality: 'session' }
    }
    if (delta <= LOOSE_WINDOW_MS && !loose) loose = { index, trace }
  }
  if (loose) {
    used.add(loose.index)
    return { trace: loose.trace, quality: 'approx' }
  }
  return null
}

function skillBefore(marks, trace) {
  if (!trace || !trace.sessionId) return null
  const at = Date.parse(trace.at || '')
  let found = null
  for (const mark of marks) {
    if (mark.sessionId !== trace.sessionId) continue
    const when = Date.parse(mark.at || '')
    if (Number.isFinite(at) && Number.isFinite(when) && when > at) continue
    if (!found || Date.parse(found.at) <= when) found = mark
  }
  return found ? found.skill : null
}

function metadataHas(metadata, sessionId) {
  if (!sessionId || sessionId.length < 8 || metadata == null) return false
  const text = typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
  return text.includes(sessionId)
}

function addBucket(map, key, row) {
  const current = map.get(key) || { key, requests: 0, spend: 0, tokens: 0 }
  current.requests += 1
  current.spend += row.spend || 0
  current.tokens += row.totalTokens || 0
  map.set(key, current)
}

function buckets(map) {
  return [...map.values()].sort((a, b) => b.spend - a.spend || b.tokens - a.tokens)
}
