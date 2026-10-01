import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { POST_IMAGES_BUCKET } from '@/blog/utils/imageStorage'
import { IMAGE_RETENTION_DAYS } from '@/blog/utils/imageRetention'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

// BLOG 이미지 보관 기간(30일)이 지난 파일을 지운다 — 2026-10-01 주인님 지시("데이터 누적을 막기 위해 보관 기간 1달").
// Vercel Cron(blog/vercel.json)이 매일 호출하며, CRON_SECRET이 맞을 때만 실행한다(회원 권한 확인 대상이 아닌 시스템 라우트).
// post-images 버킷은 threads·insta·naver-cafe와 함께 쓰므로 반드시 "<회원 id>/ai-auto-blog/" 폴더 안의 파일만 지운다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const storage = supabase.storage.from(POST_IMAGES_BUCKET)
  const cutoff = Date.now() - IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const dryRun = request.nextUrl.searchParams.get('dry') === '1'

  const owners: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list('', { limit: 1000, offset })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // 폴더는 id가 null로 온다(파일이 아닌 항목).
    owners.push(...(data ?? []).filter((item) => item.id === null).map((item) => item.name))
    if (!data || data.length < 1000) break
  }

  let checked = 0
  const expired: string[] = []
  for (const owner of owners) {
    const folder = `${owner}/ai-auto-blog`
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(folder, { limit: 1000, offset, sortBy: { column: 'created_at', order: 'asc' } })
      if (error || !data) break
      for (const file of data) {
        if (file.id === null) continue
        checked += 1
        const createdAt = file.created_at ? new Date(file.created_at).getTime() : Date.now()
        if (createdAt < cutoff) expired.push(`${folder}/${file.name}`)
      }
      if (data.length < 1000) break
    }
  }

  let removed = 0
  if (!dryRun) {
    for (let i = 0; i < expired.length; i += 100) {
      const batch = expired.slice(i, i + 100)
      const { error } = await storage.remove(batch)
      if (error) {
        console.error('[cleanup-images] remove failed:', error.message)
        return NextResponse.json({ error: error.message, removed }, { status: 500 })
      }
      removed += batch.length
    }
  }

  console.log(`[cleanup-images] retention ${IMAGE_RETENTION_DAYS}d, checked ${checked}, expired ${expired.length}, removed ${removed}${dryRun ? ' (dry-run)' : ''}`)
  return NextResponse.json({ retentionDays: IMAGE_RETENTION_DAYS, checked, expired: expired.length, removed, dryRun })
}
