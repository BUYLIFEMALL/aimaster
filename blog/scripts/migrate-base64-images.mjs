// 글 본문에 base64로 통째로 들어 있는 이미지를 Supabase Storage(post-images)로 옮기고 본문은 이미지 주소로 바꾼다.
// 2026-10-01 주인님 지시로 1회 실행(글 100·105·106번, 각 약 12~13MB → 이미지 주소만 남김).
// 실행: node scripts/migrate-base64-images.mjs [--dry-run] [--backup-dir=<폴더>]
//  - 루트 ../.env.local의 공용 Supabase 서비스 키를 쓴다(관리 작업용 — 회원 화면 코드에서는 쓰지 않는다).
//  - 바꾸기 전에 원본 본문을 backup-dir에 <글 id>.html로 저장한다(되돌릴 때 그 파일로 content를 다시 넣으면 된다).
//  - 저장 경로: <글 작성 회원 id 또는 legacy>/ai-auto-blog/migrated-<글 id>-<순번>.<확장자>
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const backupDir = (args.find((a) => a.startsWith('--backup-dir=')) ?? '--backup-dir=./.migration-backup').split('=')[1]

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, '')]),
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BUCKET = 'post-images'
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

const { data: posts, error } = await supabase.from('blog_posts').select('id, user_id, content').like('content', '%data:image/%')
if (error) throw error
console.log(`base64 이미지가 든 글: ${posts.length}개${dryRun ? ' (dry-run)' : ''}`)
fs.mkdirSync(backupDir, { recursive: true })

for (const post of posts) {
  const owner = post.user_id ?? 'legacy'
  const before = post.content
  const re = /data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)/gi
  const matches = [...before.matchAll(re)]
  let after = before
  let n = 0
  for (const m of matches) {
    n += 1
    const mime = m[1].toLowerCase()
    const objectPath = `${owner}/ai-auto-blog/migrated-${post.id}-${n}.${EXT[mime] ?? 'png'}`
    let url = `(dry-run) ${objectPath}`
    if (!dryRun) {
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(objectPath, Buffer.from(m[2].replace(/\s+/g, ''), 'base64'), { contentType: mime, upsert: true })
      if (upErr) throw new Error(`글 ${post.id} 이미지 ${n} 업로드 실패: ${upErr.message}`)
      url = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl
      const check = await fetch(url, { method: 'HEAD' })
      if (!check.ok) throw new Error(`글 ${post.id} 이미지 ${n} 공개 주소 확인 실패: ${check.status}`)
    }
    after = after.replace(m[0], url)
  }
  const mb = (s) => (s.length / 1024 / 1024).toFixed(2)
  console.log(`글 ${post.id}: 이미지 ${n}장, ${mb(before)}MB → ${mb(after)}MB`)
  if (dryRun) continue
  fs.writeFileSync(path.join(backupDir, `${post.id}.html`), before)
  const { error: updErr } = await supabase.from('blog_posts').update({ content: after }).eq('id', post.id)
  if (updErr) throw new Error(`글 ${post.id} 본문 저장 실패: ${updErr.message}`)
}
console.log('완료')
