import { NextRequest, NextResponse } from 'next/server'
// 이 라우트는 루트 AIMaster 앱(app/api/posts/generate-editor-image/route.ts)이
// export {...} from '@/blog/...' 형태로 그대로 재노출한다 — 그 빌드 컨텍스트에서는
// "@/*"가 루트 폴더를 가리키므로, 반드시 "@/blog/*"로만 내부 모듈을 참조해야 한다
// (blog/app/api/auto-post/route.ts와 동일한 관례).
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { resolveApiKey } from '@/blog/utils/apiKeys'
import { generateEditorImage } from '@/blog/utils/ai/editorImage'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/**
 * 에디터 툴바("✨ AI 이미지 생성")에서 프롬프트 하나로 이미지 1장을 즉석 생성한다.
 * kakao_auto_poster의 generateReportImageAction과 동일한 흐름이지만, blog는 이미지를
 * Supabase Storage에 올려 URL로 쓰지 않고 base64 data URI를 그대로 반환해 콘텐츠에
 * 심는다(이 프로젝트의 기존 관행 — utils/news/imageGenerator.ts 참고).
 */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const body = await request.json().catch(() => ({}))
  const prompt = String(body?.prompt ?? '').trim()
  if (!prompt) {
    return NextResponse.json({ error: '이미지로 만들 내용을 입력해주세요.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const apiKey = await resolveApiKey(supabase, access.user.id, 'gemini')
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API 키가 등록되어 있지 않습니다. 설정 페이지에서 먼저 등록해주세요.' },
      { status: 400 },
    )
  }

  try {
    const url = await generateEditorImage(prompt, apiKey)
    return NextResponse.json({ success: true, url })
  } catch (err: any) {
    console.error('[Editor Image Generate Error]:', err)
    return NextResponse.json({ error: err?.message || '이미지 생성에 실패했습니다.' }, { status: 500 })
  }
}
