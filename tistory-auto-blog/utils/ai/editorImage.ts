// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import 'server-only'
import { generateGeminiImage } from './geminiImage'

// kakao_auto_poster의 lib/ai/reportImage.ts(generateReportImage)와 동일한 패턴 —
// 에디터 툴바에서 프롬프트 하나로 이미지 1장만 즉석 생성한다. 결과 data URI는 호출부
// (app/api/posts/generate-editor-image/route.ts)가 Supabase Storage에 올려 주소로 바꾼다(2026-10-01).
const MODEL_NAME = 'gemini-nano-banana-2.1'

/**
 * 에디터에 바로 삽입할 이미지 1장을 생성해 base64 data URI로 반환한다.
 */
export async function generateEditorImage(prompt: string, apiKey: string): Promise<string> {
  // 인물이 등장할 수 있는 프롬프트라 루트 CLAUDE.md 불변의 핵심 원칙 3번(기본은 한국인/
  // 동아시아인 묘사, 해외 유명인·정치인·연예인·운동선수이거나 해외 배경이 명시된 경우에만
  // 예외)을 반영한다.
  const fullPrompt = `Create a single photorealistic photo for a blog post. Scene: ${prompt}. If human figures appear, depict realistic Korean/East Asian individuals by default — only depict a different ethnicity when the subject explicitly names a foreign celebrity, politician, athlete, or a foreign country/setting central to the scene. One unified scene in a single frame, not a collage, not a split screen, not multiple panels. Photorealistic, documentary-quality photography, natural lighting, 16:9, no visible text, no watermark.`

  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio)로.
  // 키는 머리글로, 시간 제한·일시 오류 재시도·안전 차단 안내. 프롬프트·모델·온도는 그대로(오류는 Error라 호출부와 호환).
  const { base64, mimeType } = await generateGeminiImage({
    apiKey,
    modelName: MODEL_NAME,
    prompt: fullPrompt,
    temperature: 0.7,
    responseModalities: ['Image'],
  })

  return `data:${mimeType};base64,${base64}`
}
