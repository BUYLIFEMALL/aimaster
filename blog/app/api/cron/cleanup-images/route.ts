import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { POST_IMAGES_BUCKET } from '@/blog/utils/imageStorage'
import { RETENTION_DAYS, retentionCutoff } from '@/blog/utils/imageRetention'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

// BLOG 보관 기간(30일) 정리 작업 — 2026-10-01 주인님 지시: "이미지뿐 아니라 생성했던 본문 등 글 자체가 같이 삭제되도록, 30일만 보관".
// 1) 만든 지 30일이 지난 글(blog_posts)을 지운다. 댓글·좋아요·카테고리 연결은 DB의 ON DELETE CASCADE로 함께 지워진다.
//    지우는 글 본문에 들어 있던 BLOG 이미지(Storage)도 함께 지운다.
// 2) 만든 지 30일이 지난 BLOG 이미지 파일도 지운다(글에서 빠졌거나 저장 안 한 이미지 포함).
// 3) 만든 지 30일이 지난 글감 수집 결과(blog_candidates)도 지운다.
// 주인님 정의(2026-10-01): "30일 자동 삭제는 생성된 블로그 콘텐츠 일체를 건별로, 생성 날짜 기준으로 — DB 용량이 무제한으로 쌓이는 것 방지".
// 카테고리·작성자·API 키·NewsBlur 계정 같은 설정 데이터는 콘텐츠가 아니라서 지우지 않는다.
// 기존 글은 정책 시작일(2026-10-01)부터 30일 유예 — utils/imageRetention.ts의 retentionCutoff().
// Vercel Cron(blog/vercel.json)이 매일 호출하며 CRON_SECRET이 맞을 때만 실행한다(회원 권한 확인 대상이 아닌 시스템 라우트).
// post-images 버킷은 threads·insta·naver-cafe와 함께 쓰므로 반드시 "<회원 id>/ai-auto-blog/" 안의 파일만 지운다.
// 경로 이름(cleanup-images)은 Vercel Cron 등록과 맞추려고 그대로 둔다.
const BLOG_IMAGE_PATH = /\/storage\/v1\/object\/public\/post-images\/([0-9a-z-]+\/ai-auto-blog\/[^"')\s?#]+)/gi

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'
  const cutoff = retentionCutoff()
  if (!cutoff) {
    return NextResponse.json({ retentionDays: RETENTION_DAYS, note: '정책 시작 후 30일 유예 기간이라 지울 대상이 없습니다.', dryRun })
  }

  const supabase = createAdminClient()
  const storage = supabase.storage.from(POST_IMAGES_BUCKET)
  const toRemove = new Set<string>()

  // 1) 오래된 글
  const { data: oldPosts, error: postsError } = await supabase
    .from('blog_posts')
    .select('id, content')
    .lt('published_at', cutoff.toISOString())
  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 })
  for (const post of oldPosts ?? []) {
    for (const match of String(post.content ?? '').matchAll(BLOG_IMAGE_PATH)) toRemove.add(decodeURIComponent(match[1]))
  }

  // 2) 오래된 BLOG 이미지 파일
  const owners: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list('', { limit: 1000, offset })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    owners.push(...(data ?? []).filter((item) => item.id === null).map((item) => item.name)) // 폴더는 id가 null
    if (!data || data.length < 1000) break
  }
  let checkedImages = 0
  for (const owner of owners) {
    const folder = `${owner}/ai-auto-blog`
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(folder, { limit: 1000, offset })
      if (error || !data) break
      for (const file of data) {
        if (file.id === null) continue
        checkedImages += 1
        if (file.created_at && new Date(file.created_at) < cutoff) toRemove.add(`${folder}/${file.name}`)
      }
      if (data.length < 1000) break
    }
  }

  // 3) 오래된 글감 수집 결과
  const { count: expiredCandidates, error: candError } = await supabase
    .from('blog_candidates')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', cutoff.toISOString())
  if (candError) return NextResponse.json({ error: candError.message }, { status: 500 })

  const postIds = (oldPosts ?? []).map((post) => post.id)
  const imagePaths = [...toRemove]
  let removedImages = 0
  let removedPosts = 0
  let removedCandidates = 0
  if (!dryRun) {
    for (let i = 0; i < imagePaths.length; i += 100) {
      const batch = imagePaths.slice(i, i + 100)
      const { error } = await storage.remove(batch)
      if (error) return NextResponse.json({ error: error.message, removedImages }, { status: 500 })
      removedImages += batch.length
    }
    if (postIds.length > 0) {
      const { error } = await supabase.from('blog_posts').delete().in('id', postIds)
      if (error) return NextResponse.json({ error: error.message, removedImages }, { status: 500 })
      removedPosts = postIds.length
    }
    if ((expiredCandidates ?? 0) > 0) {
      const { error } = await supabase.from('blog_candidates').delete().lt('created_at', cutoff.toISOString())
      if (error) return NextResponse.json({ error: error.message, removedImages, removedPosts }, { status: 500 })
      removedCandidates = expiredCandidates ?? 0
    }
  }

  console.log(
    `[cleanup] retention ${RETENTION_DAYS}d, cutoff ${cutoff.toISOString()}, posts ${postIds.length}, images checked ${checkedImages} / to remove ${imagePaths.length}, candidates ${expiredCandidates ?? 0}, removed posts ${removedPosts} images ${removedImages} candidates ${removedCandidates}${dryRun ? ' (dry-run)' : ''}`,
  )
  return NextResponse.json({
    retentionDays: RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    expiredPosts: postIds.length,
    checkedImages,
    expiredImages: imagePaths.length,
    removedPosts,
    removedImages,
    expiredCandidates: expiredCandidates ?? 0,
    removedCandidates,
    dryRun,
  })
}
