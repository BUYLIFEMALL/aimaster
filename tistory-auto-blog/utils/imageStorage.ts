import 'server-only'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/blog/utils/supabase/admin'

// AI로 만든 이미지를 공용 Supabase Storage(post-images, public)에 올리고 공개 주소를 돌려준다.
// 2026-10-01 주인님 지시로 BLOG의 모든 이미지(자동 생성·편집기 AI 생성·편집기 첨부)를 이 방식으로 바꿨다.
// 예전엔 회원 Cloudinary에 올리거나, Cloudinary가 없으면 이미지를 base64 문자열로 글 본문에 통째로 넣어서
// 글 1개가 12MB가 넘기도 했다. 루트 docs/PLATFORM_PATTERNS.md §12(AI 이미지는 Supabase Storage)와 같은 규칙.
// 경로는 threads·insta·naver-cafe와 같은 "<회원 id>/..." — 버킷 RLS가 본인 폴더에만 쓰기를 허용한다.
export const POST_IMAGES_BUCKET = 'post-images'

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** base64 이미지 데이터를 올리고 공개 주소를 돌려준다. 실패하면 오류를 던진다. */
export async function uploadBase64Image(userId: string, base64: string, mimeType = 'image/png'): Promise<string> {
  const ext = EXT_BY_MIME[mimeType] ?? 'png'
  const path = `${userId}/tistory-auto-blog/${randomUUID()}.${ext}`
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, Buffer.from(base64.replace(/\s+/g, ''), 'base64'), { contentType: mimeType, upsert: false })
  if (error) throw new Error(`이미지 저장(Storage) 실패: ${error.message}`)
  return supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}

/** "data:image/png;base64,..." 형태를 올리고 공개 주소를 돌려준다. */
export async function uploadDataUriImage(userId: string, dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) throw new Error('이미지 데이터 형식이 올바르지 않습니다.')
  return uploadBase64Image(userId, match[2], match[1])
}
