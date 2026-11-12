/**
 * Installed copy versus the npm release.
 * Updating downloads only this package and replaces it in the DSH profile.
 * A full pnpm add reinstalls every plugin, so one missing local tarball
 * blocks the update. The running app keeps the old code until it is quit
 * and opened again.
 */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
export const PACKAGE_NAME = 'dsh-litellm-panel'
export const REGISTRIES = [
  'https://registry.npmjs.org',
  'https://registry.npmmirror.com',
]
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/
const PROFILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$/
const INTEGRITY = /^sha512-[A-Za-z0-9+/]+={0,2}$/
const MAX_TARBALL_BYTES = 8 * 1024 * 1024

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
  return (await fetchRelease(fetchImpl)).version
}

export async function fetchRelease(fetchImpl = globalThis.fetch) {
  let last = null
  for (const registry of REGISTRIES) {
    try {
      const body = await readJson(fetchImpl, `${registry}/${PACKAGE_NAME}/latest`)
      const version = body && body.version
      if (!parseVersion(version)) throw new Error('npm 返回的版本号不合法')
      return { version, registry }
    } catch (err) {
      last = err
    }
  }
  const detail = last instanceof Error && last.message ? last.message : '查不到 npm 上的版本'
  throw Object.assign(new Error(`连不上 npm。已试过官方源和国内镜像。${detail}`), { status: 502 })
}

export async function releaseStatus(options = {}) {
  const current = options.current || packageVersion()
  const profile = findProfile(options.moduleUrl)
  let latest = null
  let registry = null
  let error = null
  try {
    const release = await fetchRelease(options.fetch)
    latest = release.version
    registry = release.registry
  } catch (err) {
    error = err instanceof Error && err.message ? err.message : '查不到 npm 上的版本'
  }
  const newer = latest ? compareVersions(latest, current) : null
  return {
    ok: true,
    current,
    latest,
    registry,
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
  const spawn = options.spawn || installReleasedPackage
  await spawn(profile, status.latest, { registry: status.registry, fetch: options.fetch })
  return {
    ok: true,
    current: status.current,
    installed: status.latest,
    profile: profile.name,
    registry: status.registry,
    restart: true,
  }
}

export function rewriteDependency(text, version) {
  if (!parseVersion(version)) throw Object.assign(new Error('版本号不合法'), { status: 500 })
  const pattern = new RegExp(`("${PACKAGE_NAME}"\\s*:\\s*")[^"]*(")`)
  if (!pattern.test(text)) throw Object.assign(new Error('配置里没有这个插件'), { status: 500 })
  return text.replace(pattern, `$1${version}$2`)
}

export function rewritePanelLock(text, version, integrity) {
  if (!parseVersion(version)) throw Object.assign(new Error('版本号不合法'), { status: 500 })
  if (!INTEGRITY.test(integrity)) throw Object.assign(new Error('安装包校验值不合法'), { status: 502 })
  const block = new RegExp(
    `^([ \\t]+${PACKAGE_NAME}:\\n[ \\t]+specifier:[ \\t]*)(\\S+)(\\n[ \\t]+version:[ \\t]*)(\\S+)`,
    'm',
  )
  const found = block.exec(text)
  if (!found) throw Object.assign(new Error('锁定文件里没有这个插件'), { status: 500 })
  const previous = found[4]
  let next = text.replace(block, `$1${version}$3${version}`)
  next = next.replaceAll(`${PACKAGE_NAME}@${previous}:`, `${PACKAGE_NAME}@${version}:`)
  const section = new RegExp(
    `(${PACKAGE_NAME}@${escapeRegExp(version)}:\\n\\s+resolution:\\s*\\{integrity:\\s*)sha512-[^}\\s]+`,
  )
  if (!section.test(next)) throw Object.assign(new Error('锁定文件里没有这个插件的校验值'), { status: 500 })
  return next.replace(section, `$1${integrity}`)
}

export function assertTarballEntries(listing) {
  const lines = String(listing).split('\n').map(line => line.trim()).filter(Boolean)
  if (!lines.length) throw Object.assign(new Error('安装包是空的'), { status: 502 })
  for (const line of lines) {
    const name = line.replace(/^\.\//, '')
    const parts = name.split('/')
    if (name.startsWith('/') || parts.includes('..') || parts.includes('node_modules') || !(name === 'package' || name.startsWith('package/'))) {
      throw Object.assign(new Error('安装包里有不允许的路径'), { status: 502 })
    }
  }
}

async function installReleasedPackage(profile, version, context = {}) {
  const registry = context.registry || REGISTRIES[0]
  if (!REGISTRIES.includes(registry)) throw Object.assign(new Error('不认识的安装源'), { status: 500 })
  if (!parseVersion(version)) throw Object.assign(new Error('版本号不合法'), { status: 500 })
  const fetchImpl = context.fetch || globalThis.fetch
  const meta = await readJson(fetchImpl, `${registry}/${PACKAGE_NAME}/${version}`)
  const integrity = meta && meta.dist && meta.dist.integrity
  if (!INTEGRITY.test(integrity || '')) throw Object.assign(new Error('npm 没有给出安装包校验值'), { status: 502 })
  const packed = await readBytes(fetchImpl, `${registry}/${PACKAGE_NAME}/-/${PACKAGE_NAME}-${version}.tgz`)
  const actual = createHash('sha512').update(packed).digest('base64')
  if (actual !== integrity.slice('sha512-'.length)) {
    throw Object.assign(new Error('安装包校验失败'), { status: 502 })
  }
  const manifestPath = path.join(profile.dir, 'package.json')
  const lockPath = path.join(profile.dir, 'pnpm-lock.yaml')
  const manifest = rewriteDependency(await readFile(manifestPath, 'utf8'), version)
  let lock = null
  try {
    lock = rewritePanelLock(await readFile(lockPath, 'utf8'), version, integrity)
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err
  }
  const staging = path.join(profile.dir, 'node_modules', `.${PACKAGE_NAME}.incoming`)
  const extracted = path.join(staging, 'package')
  const dest = path.join(profile.dir, 'node_modules', PACKAGE_NAME)
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  const tarball = path.join(staging, 'package.tgz')
  try {
    await writeFile(tarball, packed, { mode: 0o600 })
    const listed = await execFileAsync('tar', ['-tzf', tarball], { timeout: 30000, encoding: 'utf8' })
    assertTarballEntries(listed.stdout)
    await execFileAsync('tar', ['-xzf', tarball, '-C', staging], { timeout: 30000 })
    const packedManifest = JSON.parse(await readFile(path.join(extracted, 'package.json'), 'utf8'))
    if (packedManifest.name !== PACKAGE_NAME || packedManifest.version !== version) {
      throw Object.assign(new Error('安装包内容和版本不一致'), { status: 502 })
    }
    await rm(dest, { recursive: true, force: true })
    await mkdir(path.dirname(dest), { recursive: true })
    await rename(extracted, dest)
    await writeFile(manifestPath, manifest)
    if (lock !== null) await writeFile(lockPath, lock)
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

async function readJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw Object.assign(new Error(`查不到版本（HTTP ${response.status}）`), { status: 502 })
  return response.json()
}

async function readBytes(fetchImpl, url) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw Object.assign(new Error(`安装包下载失败（HTTP ${response.status}）`), { status: 502 })
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_TARBALL_BYTES) {
    throw Object.assign(new Error('安装包大小不正常'), { status: 502 })
  }
  return bytes
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
