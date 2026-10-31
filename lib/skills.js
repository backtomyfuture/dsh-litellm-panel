/**
 * Local skill roots plus a hub that copies SKILL.md trees into ~/.dsh/skills.
 * Disabling a user skill moves it out of the scan root. DSH's own watcher
 * picks the add and the remove up.
 */
import { execFile } from 'node:child_process'
import { cp, mkdir, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const SKILL_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,64}$/
const GIT_URL = /^(https:\/\/[^\s]+|ssh:\/\/[^\s]+|git@[A-Za-z0-9._-]+:[A-Za-z0-9._~/-]+)$/
const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', 'dist'])

export function assertSkillName(name) {
  if (!SKILL_NAME.test(name) || name === '.' || name === '..' || name.includes('..')) {
    throw Object.assign(new Error(`技能名不合法：${name}`), { status: 400 })
  }
  return name
}

export function parseFrontmatter(text) {
  const source = String(text || '').replace(/^\uFEFF/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return { data: {}, body: source }
  const data = {}
  const lines = match[1].split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const field = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line)
    if (!field) continue
    let value = field[2].trim()
    if (value === '|' || value === '>' || value === '|-' || value === '>-') {
      const block = []
      while (index + 1 < lines.length && /^\s+\S/.test(lines[index + 1])) {
        index += 1
        block.push(lines[index].trim())
      }
      value = block.join(value.startsWith('>') ? ' ' : '\n')
    } else {
      value = value.replace(/^['"]|['"]$/g, '')
    }
    data[field[1]] = value
  }
  return { data, body: source.slice(match[0].length) }
}

export async function findGitRoot(start, exists = defaultExists) {
  let current = path.resolve(start)
  const root = path.parse(current).root
  while (true) {
    if (await exists(path.join(current, '.git'))) return current
    if (current === root) return null
    current = path.dirname(current)
  }
}

async function defaultExists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

export function skillRoots({ home, projectRoot, agentsHome = path.join(homedir(), '.agents') }) {
  const roots = []
  if (projectRoot) {
    roots.push({ id: 'project-dsh', rank: 100, dir: path.join(projectRoot, '.dsh', 'skills'), writable: false })
    roots.push({ id: 'project-agents', rank: 200, dir: path.join(projectRoot, '.agents', 'skills'), writable: false })
  }
  roots.push({ id: 'user-dsh', rank: 400, dir: path.join(home, 'skills'), writable: true })
  roots.push({ id: 'user-agents', rank: 500, dir: path.join(agentsHome, 'skills'), writable: false })
  return roots
}

export async function scanSkills(options) {
  const roots = skillRoots(options)
  const disabledDir = path.join(options.home, 'resource-center', 'disabled-skills')
  const found = []
  for (const root of roots) {
    const rows = await readSkillRoot(root)
    for (const row of rows) found.push(row)
  }
  const disabled = await readSkillRoot({ id: 'disabled', rank: 1000, dir: disabledDir, writable: true })
  const visible = new Map()
  for (const row of [...found].sort((a, b) => a.rank - b.rank)) {
    if (!visible.has(row.name)) visible.set(row.name, { ...row, enabled: true })
  }
  for (const row of disabled) {
    if (!visible.has(row.name)) visible.set(row.name, { ...row, enabled: false, source: 'disabled' })
  }
  return {
    roots: roots.map(root => ({ id: root.id, rank: root.rank, dir: root.dir })),
    skills: [...visible.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

async function readSkillRoot(root) {
  let entries
  try {
    entries = await readdir(root.dir, { withFileTypes: true })
  } catch {
    return []
  }
  const rows = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    try {
      if (entry.isDirectory()) {
        const skillFile = await firstExisting(path.join(root.dir, entry.name), ['SKILL.md', 'skill.md'])
        if (!skillFile) continue
        rows.push(await skillRecord(root, entry.name, 'dir', skillFile))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const name = entry.name.slice(0, -3)
        rows.push(await skillRecord(root, name, 'file', path.join(root.dir, entry.name)))
      }
    } catch {
      rows.push({
        name: entry.name.replace(/\.md$/, ''),
        source: root.id,
        rank: root.rank,
        kind: entry.isDirectory() ? 'dir' : 'file',
        description: '',
        error: '这一条读不出来',
        writable: root.writable === true && root.id === 'user-dsh',
      })
    }
  }
  return rows
}

export function dshSkillIssue(name, data) {
  const declared = data && typeof data.name === 'string' ? data.name.trim() : ''
  const description = data && typeof data.description === 'string' ? data.description.trim() : ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return 'DSH 只加载小写 kebab-case 技能名，这个不会出现在对话里'
  if (!declared) return 'SKILL.md 缺少 name，DSH 不会加载'
  if (declared !== name) return 'SKILL.md 的 name 和目录名不一致，DSH 不会加载'
  if (!description) return 'SKILL.md 缺少 description，DSH 不会加载'
  return ''
}

async function skillRecord(root, name, kind, file) {
  const text = await readFile(file, 'utf8')
  const parsed = parseFrontmatter(text)
  const description = String(parsed.data.description || '').replace(/\s+/g, ' ').slice(0, 240)
  return {
    name,
    source: root.id,
    rank: root.rank,
    kind,
    description,
    writable: root.id === 'user-dsh' || root.id === 'disabled',
    file,
    error: dshSkillIssue(name, { name: parsed.data.name, description }) || null,
  }
}

async function firstExisting(dir, names) {
  for (const name of names) {
    const candidate = path.join(dir, name)
    try {
      const info = await stat(candidate)
      if (info.isFile()) return candidate
    } catch {
      // try the next spelling
    }
  }
  return null
}

export async function previewSkill(scanned, name) {
  assertSkillName(name)
  const skill = scanned.skills.find(row => row.name === name)
  if (!skill || !skill.file) throw Object.assign(new Error('没有这个技能'), { status: 404 })
  const root = path.dirname(skill.kind === 'file' ? skill.file : path.dirname(skill.file))
  await assertInside(skill.file, root)
  const text = await readFile(skill.file, 'utf8')
  const parsed = parseFrontmatter(text)
  return {
    name: skill.name,
    source: skill.source,
    description: parsed.data.description || skill.description || '',
    body: parsed.body.slice(0, 12000),
    truncated: parsed.body.length > 12000,
  }
}

export async function setSkillEnabled(options, name, enabled) {
  assertSkillName(name)
  const scanned = await scanSkills(options)
  const skill = scanned.skills.find(row => row.name === name)
  if (!skill) throw Object.assign(new Error('没有这个技能'), { status: 404 })
  const userDir = path.join(options.home, 'skills')
  const disabledDir = path.join(options.home, 'resource-center', 'disabled-skills')
  if (enabled) {
    if (skill.enabled) return scanned
    if (skill.source !== 'disabled') throw Object.assign(new Error('这个技能不在停用区'), { status: 400 })
    await moveSkill(skill, disabledDir, userDir)
  } else {
    if (!skill.enabled) return scanned
    if (skill.source !== 'user-dsh') {
      throw Object.assign(new Error('只有用户目录 ~/.dsh/skills 里的技能可以在这里停用。项目技能请留在仓库里。'), { status: 400 })
    }
    await moveSkill(skill, userDir, disabledDir)
  }
  return scanSkills(options)
}

async function moveSkill(skill, fromRoot, toRoot) {
  const from = skill.kind === 'file'
    ? path.join(fromRoot, `${skill.name}.md`)
    : path.join(fromRoot, skill.name)
  const to = skill.kind === 'file'
    ? path.join(toRoot, `${skill.name}.md`)
    : path.join(toRoot, skill.name)
  await assertInside(from, fromRoot)
  await mkdir(toRoot, { recursive: true, mode: 0o700 })
  try {
    await stat(to)
    throw Object.assign(new Error('目标位置已经有同名技能'), { status: 409 })
  } catch (err) {
    if (err && err.status === 409) throw err
  }
  await rename(from, to)
}

export function githubBlobToRaw(input) {
  let url
  try {
    url = new URL(input)
  } catch {
    return input
  }
  if (url.hostname !== 'github.com') return input
  const parts = url.pathname.split('/').filter(Boolean)
  const blob = parts.indexOf('blob')
  if (blob < 2 || blob + 1 >= parts.length) return input
  const owner = parts[0]
  const repo = parts[1]
  const ref = parts[blob + 1]
  const rest = parts.slice(blob + 2).join('/')
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${rest}`
}

export function classifyHubUrl(input, forced) {
  const raw = githubBlobToRaw(String(input || '').trim())
  if (forced === 'git') {
    if (!GIT_URL.test(raw)) throw Object.assign(new Error('Git 地址不合法'), { status: 400 })
    return { kind: 'git', url: raw }
  }
  if (forced === 'http') {
    return { kind: 'http', url: httpUrl(raw) }
  }
  if (GIT_URL.test(raw) && !raw.endsWith('.md') && !raw.includes('/raw/')) {
    const asHttps = raw.replace(/^git@([^:]+):/, 'https://$1/')
    let pathname = ''
    try {
      pathname = new URL(asHttps).pathname
    } catch {
      pathname = ''
    }
    if (raw.endsWith('.git') || raw.startsWith('git@') || !/\.[a-z0-9]{1,6}$/i.test(pathname)) {
      return { kind: 'git', url: raw }
    }
  }
  return { kind: 'http', url: httpUrl(raw) }
}

function httpUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw Object.assign(new Error('仓库地址不合法'), { status: 400 })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw Object.assign(new Error('只接受 http、https 或 git 地址'), { status: 400 })
  return url.toString()
}

export function gitCloneArgs(url, dir) {
  if (!GIT_URL.test(url)) throw Object.assign(new Error('Git 地址不合法'), { status: 400 })
  return ['clone', '--depth', '1', '--', url, dir]
}

export async function discoverHttp(url, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(url, { headers: { accept: 'text/markdown, text/plain, application/json' } })
  if (!response.ok) throw Object.assign(new Error(`拉取失败：HTTP ${response.status}`), { status: 502 })
  const text = await response.text()
  if (text.length > 1024 * 1024) throw Object.assign(new Error('文件超过 1MB'), { status: 400 })
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let payload
    try {
      payload = JSON.parse(trimmed)
    } catch {
      payload = null
    }
    const skills = payload && Array.isArray(payload.skills) ? payload.skills : null
    if (skills) {
      return skills.map((row) => {
        const name = assertSkillName(String(row.name || ''))
        const skillUrl = githubBlobToRaw(String(row.url || ''))
        return { name, description: String(row.description || '').slice(0, 240), url: skillUrl, kind: 'http' }
      })
    }
  }
  const parsed = parseFrontmatter(text)
  const fromFile = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
  const name = assertSkillName(String(parsed.data.name || fromFile.replace(/\.md$/i, '') || 'skill'))
  return [{
    name,
    description: String(parsed.data.description || '').slice(0, 240),
    url,
    kind: 'http',
    body: text,
  }]
}

export async function listSkillDirs(root) {
  const found = []
  async function walk(dir, depth) {
    if (depth > 5 || found.length >= 200) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    const skill = entries.find(entry => entry.isFile() && (entry.name === 'SKILL.md' || entry.name === 'skill.md'))
    if (skill) {
      const file = path.join(dir, skill.name)
      const text = await readFile(file, 'utf8')
      const parsed = parseFrontmatter(text)
      const atRoot = path.resolve(dir) === path.resolve(root)
      const name = atRoot ? String(parsed.data.name || '') : path.basename(dir)
      if (name && SKILL_NAME.test(name)) {
        found.push({
          name,
          description: String(parsed.data.description || '').slice(0, 240),
          dir,
          relative: path.relative(root, dir) || '.',
        })
      }
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
      await walk(path.join(dir, entry.name), depth + 1)
    }
  }
  await walk(root, 0)
  return found
}

export function assertCanInstall(skills, hub, names) {
  for (const name of names) {
    assertSkillName(name)
    const exists = skills.some(skill => skill.name === name)
    const owned = (hub || []).some(item => item.name === name)
    if (exists && !owned) {
      throw Object.assign(new Error(`${name} 已经在本机，不是从资源中心安装的`), { status: 409 })
    }
  }
}

export async function installHttpSkill(options, item, fetchImpl = globalThis.fetch) {
  const name = assertSkillName(item.name)
  let body = item.body
  if (!body) {
    const response = await fetchImpl(item.url)
    if (!response.ok) throw Object.assign(new Error(`${name} 拉取失败：HTTP ${response.status}`), { status: 502 })
    body = await response.text()
    if (body.length > 1024 * 1024) throw Object.assign(new Error(`${name} 超过 1MB`), { status: 400 })
  }
  const dest = path.join(options.home, 'skills', name)
  await mkdir(dest, { recursive: true, mode: 0o700 })
  const { writeFile } = await import('node:fs/promises')
  await writeFile(path.join(dest, 'SKILL.md'), body.endsWith('\n') ? body : `${body}\n`, { mode: 0o644 })
  return hubRecord(name, item.url, 'http', '.')
}

export async function withClonedRepo(url, deps, fn) {
  const argsBuilder = deps.gitCloneArgs || gitCloneArgs
  const run = deps.run || ((cmd, args, opts) => execFileAsync(cmd, args, opts))
  const mkdtemp = deps.mkdtemp || (async () => {
    const { mkdtemp: make } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    return make(path.join(tmpdir(), 'dsh-skill-'))
  })
  const dir = await mkdtemp()
  try {
    await run('git', argsBuilder(url, dir), { timeout: 30000 })
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function installGitSkills(options, url, names, deps = {}) {
  return withClonedRepo(url, deps, async (dir) => {
    const found = await listSkillDirs(dir)
    const selected = found.filter(skill => names.includes(skill.name))
    if (selected.length === 0) throw Object.assign(new Error('仓库里没有选中的技能'), { status: 404 })
    const records = []
    for (const skill of selected) {
      const name = assertSkillName(skill.name)
      const dest = path.join(options.home, 'skills', name)
      await rm(dest, { recursive: true, force: true })
      await mkdir(path.dirname(dest), { recursive: true })
      await cp(skill.dir, dest, {
        recursive: true,
        filter: source => !source.split(path.sep).some(part => SKIP_DIRS.has(part)),
      })
      records.push(hubRecord(name, url, 'git', skill.relative))
    }
    return records
  })
}

export async function uninstallHubSkill(options, record) {
  const name = assertSkillName(record.name)
  const dest = path.join(options.home, 'skills', name)
  await assertInside(dest, path.join(options.home, 'skills'))
  await rm(dest, { recursive: true, force: true })
  const parkedRoot = path.join(options.home, 'resource-center', 'disabled-skills')
  const parked = path.join(parkedRoot, name)
  await assertInside(parked, parkedRoot)
  await rm(parked, { recursive: true, force: true })
  await rm(path.join(parkedRoot, `${name}.md`), { force: true })
}

function hubRecord(name, url, kind, relative) {
  return {
    name,
    url,
    kind,
    relative,
    installedAt: new Date().toISOString(),
  }
}

async function assertInside(target, root) {
  let realTarget
  let realRoot
  try {
    realRoot = await realpath(root)
    realTarget = await realpath(target)
  } catch (err) {
    if (err && err.code === 'ENOENT') return
    throw err
  }
  if (realTarget !== realRoot && !realTarget.startsWith(realRoot + path.sep)) {
    throw Object.assign(new Error('路径越出了技能目录'), { status: 400 })
  }
}

