/**
 * Installed copy versus the npm release.
 * Updating runs pnpm inside the DSH profile that holds this package.
 * The running app keeps the old code until it is quit and opened again.
 */
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
export const PACKAGE_NAME = 'dsh-litellm-panel'
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/
const PROFILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$/
const UPDATE_TIMEOUT_MS = 180000

export function packageVersion() {
  const file = fileURLToPath(new URL('../package.json', import.meta.url))
  return JSON.parse(readFileSync(file, 'utf8')).version
}

export function parseVersion(value) {
  const match = VERSION.exec(String(value || ''))
  if (!match) return null
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] || '',
  }
}

export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) return null
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] > b.numbers[index] ? 1 : -1
  }
  if (a.pre === b.pre) return 0
  if (!a.pre) return 1
  if (!b.pre) return -1
  return a.pre > b.pre ? 1 : -1
}

export function findProfile(moduleUrl = import.meta.url) {
  let dir = path.dirname(fileURLToPath(moduleUrl))
  for (let depth = 0; depth < 8; depth += 1) {
    const parent = path.dirname(dir)
    if (path.basename(parent) === 'profiles') {
      const name = path.basename(dir)
      if (!PROFILE.test(name)) return null
      return { name, dir }
    }
    if (parent === dir) return null
    dir = parent
  }
  return null
}

export async function fetchLatestVersion(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw Object.assign(new Error('查不到 npm 上的版本'), { status: 502 })
  }
  const body = await response.json()
  const version = body && body.version
  if (!parseVersion(version)) throw Object.assign(new Error('npm 返回的版本号不合法'), { status: 502 })
  return version
}

export async function releaseStatus(options = {}) {
  const current = options.current || packageVersion()
  const profile = findProfile(options.moduleUrl)
  let latest = null
  let error = null
  try {
    latest = await fetchLatestVersion(options.fetch)
  } catch (err) {
    error = err instanceof Error && err.message ? err.message : '查不到 npm 上的版本'
  }
  const newer = latest ? compareVersions(latest, current) : null
  return {
    ok: true,
    current,
    latest,
    updateAvailable: newer === 1,
    profile: profile ? profile.name : null,
    canUpdate: Boolean(profile && newer === 1),
    error,
  }
}

export async function applyUpdate(options = {}) {
  const profile = findProfile(options.moduleUrl)
  const status = await releaseStatus(options)
  if (!status.latest) throw Object.assign(new Error(status.error || '查不到可安装的版本'), { status: 502 })
  if (!status.updateAvailable) throw Object.assign(new Error('已经是最新版本'), { status: 409 })
  if (!profile) throw Object.assign(new Error('这个副本不是从 DSH 配置里安装的，页面上不能更新'), { status: 400 })
  const spawn = options.spawn || installWithPnpm
  await spawn(profile, status.latest)
  return {
    ok: true,
    current: status.current,
    installed: status.latest,
    profile: profile.name,
    restart: true,
  }
}

async function installWithPnpm(profile, version) {
  const env = { ...process.env, PATH: commandPath() }
  try {
    await execFileAsync('pnpm', ['add', `${PACKAGE_NAME}@${version}`], {
      cwd: profile.dir,
      env,
      timeout: UPDATE_TIMEOUT_MS,
      windowsHide: true,
    })
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw Object.assign(new Error('找不到 pnpm，没法在页面里更新'), { status: 500 })
    }
    const stderr = err && err.stderr ? String(err.stderr).trim().split('\n').pop() : ''
    throw Object.assign(new Error(stderr ? `更新失败：${stderr}` : '更新失败'), { status: 500 })
  }
}

function commandPath() {
  const prefix = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    path.join(homedir(), '.local/bin'),
  ].join(path.delimiter)
  return `${prefix}${path.delimiter}${process.env.PATH || ''}`
}
