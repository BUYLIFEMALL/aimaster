// 2026-11-02: 30일 삭제 예외 회원(profiles.retention_exempt)의 글·이미지·글감은 정리에서 빠진다. 네트워크 없음.
// 같은 파일을 tistory-auto-blog/tests에도 두고 PROGRAM만 바꿔 쓴다.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const PROGRAM = path.basename(path.resolve(__dirname, '..'))
const PREFIX = PROGRAM === 'tistory-auto-blog' ? 'tistory' : 'blog'
const POSTS = `${PREFIX}_posts`, CANDS = `${PREFIX}_candidates`
const ADMIN = '00000000-0000-4000-8000-00000000000a'
const MEMBER = '00000000-0000-4000-8000-00000000000b'
const OLD = new Date(Date.now() - 40 * 86400000).toISOString()

function harness({ profileError = false, standalone = false } = {}) {
  const tables = {
    profiles: [{ id: ADMIN, retention_exempt: true }, { id: MEMBER, retention_exempt: false }],
    [POSTS]: [{ id: 'p1', user_id: ADMIN, published_at: OLD, content: '' }, { id: 'p2', user_id: MEMBER, published_at: OLD, content: '' }],
    [CANDS]: [{ id: 'c1', user_id: ADMIN, created_at: OLD }, { id: 'c2', user_id: MEMBER, created_at: OLD }],
  }
  const files = new Map([[`${ADMIN}/${PROGRAM}/a.png`, OLD], [`${MEMBER}/${PROGRAM}/b.png`, OLD]])
  const removed = []
  const storage = {
    async list(folder, { offset }) {
      if (offset) return { data: [], error: null }
      if (folder === '') return { data: [...new Set([...files.keys()].map(k => k.split('/')[0]))].map(name => ({ name, id: null })), error: null }
      return { data: [...files].filter(([k]) => k.startsWith(folder + '/')).map(([k, created]) => ({ name: k.slice(folder.length + 1), id: k, created_at: created })), error: null }
    },
    async remove(paths) { removed.push(...paths); paths.forEach(p => files.delete(p)); return { error: null } },
  }
  const client = {
    storage: { from: () => storage },
    from(table) {
      const filters = []; let mode = 'select'
      const finish = () => {
        if (table === 'profiles' && profileError) return { data: null, count: null, error: { message: '읽기 실패' } }
        const hit = tables[table].filter(r => filters.every(f => f(r)))
        if (mode === 'delete') tables[table] = tables[table].filter(r => !hit.includes(r))
        return { data: hit.map(r => ({ ...r })), count: hit.length, error: null }
      }
      const q = {
        select() { return q }, delete() { mode = 'delete'; return q }, range() { return q },
        lt(k, v) { filters.push(r => r[k] < v); return q }, eq(k, v) { filters.push(r => r[k] === v); return q },
        in(k, v) { filters.push(r => v.includes(r[k])); return q },
        not(k, op, v) { assert.equal(op, 'in'); const ids = v.slice(1, -1).split(','); filters.push(r => !ids.includes(r[k])); return q },
        then(resolve) { resolve(finish()) },
      }
      return q
    },
  }
  const root = path.resolve(__dirname, '..')
  const cache = new Map()
  function load(rel) {
    if (cache.has(rel)) return cache.get(rel)
    const module = { exports: {} }
    const code = ts.transpileModule(fs.readFileSync(path.join(root, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const mock = name => {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }
      if (name === '@/blog/utils/supabase/admin') return { createAdminClient: () => client }
      if (name === '@/blog/utils/imageStorage') return { POST_IMAGES_BUCKET: 'post-images' }
      if (name === '@/blog/utils/imageRetention') return { RETENTION_DAYS: 30, retentionCutoff: () => new Date(Date.now() - 30 * 86400000) }
      if (name === '@/blog/utils/cleanupUsageLog') return { addCleanupCount: () => {}, logCleanupUsage: async () => {}, ownerFromPath: p => p.split('/')[0] }
      if (name === '@/lib/deployment') return { IS_STANDALONE: standalone }
      return require(name)
    }
    new Function('require', 'module', 'exports', code)(mock, module, module.exports)
    cache.set(rel, module.exports)
    return module.exports
  }
  const route = load('app/api/cron/cleanup-images/route.ts')
  const run = (dry = false) => route.GET({ headers: { get: () => 'Bearer mock-cron' }, nextUrl: new URL(`https://test/api/cron/cleanup-images${dry ? '?dry=1' : ''}`) })
  return { tables, files, removed, run }
}

function withSecret(fn) {
  return async () => {
    const previous = process.env.CRON_SECRET; process.env.CRON_SECRET = 'mock-cron'
    try { await fn() } finally { previous === undefined ? delete process.env.CRON_SECRET : process.env.CRON_SECRET = previous }
  }
}

test(`${PROGRAM}: 예외 회원의 글·이미지·글감은 남기고 일반 회원 것만 지운다`, withSecret(async () => {
  const h = harness()
  const result = await h.run()
  assert.equal(result.status, 200)
  assert.equal(result.body.removedPosts, 1); assert.equal(result.body.removedCandidates, 1); assert.equal(result.body.removedImages, 1)
  assert.deepEqual(h.tables[POSTS].map(r => r.user_id), [ADMIN])
  assert.deepEqual(h.tables[CANDS].map(r => r.user_id), [ADMIN])
  assert.deepEqual(h.removed, [`${MEMBER}/${PROGRAM}/b.png`]); assert.ok(h.files.has(`${ADMIN}/${PROGRAM}/a.png`))
}))

test(`${PROGRAM}: 예외 회원 목록을 못 읽으면 아무것도 지우지 않는다`, withSecret(async () => {
  const h = harness({ profileError: true })
  const result = await h.run()
  assert.equal(result.status, 503)
  assert.equal(h.tables[POSTS].length, 2); assert.equal(h.tables[CANDS].length, 2); assert.equal(h.removed.length, 0)
}))
