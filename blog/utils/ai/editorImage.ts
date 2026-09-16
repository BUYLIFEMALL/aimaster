import 'server-only'

// kakao_auto_poster의 lib/ai/reportImage.ts(generateReportImage)와 동일한 패턴 —
// 에디터 툴바에서 프롬프트 하나로 이미지 1장만 즉석 생성한다. blog는 이미지를 Supabase
// Storage에 올려 URL로 쓰지 않고 base64 data URI로 콘텐츠에 그대로 심는 기존 관행을
// 따른다(utils/news/imageGenerator.ts의 생성 파이프라인과 posts/[id]/edit/page.tsx의
// replaceBase64WithImageTags가 이미 이 방식을 전제로 만들어져 있다).
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent'

/**
 * 에디터에 바로 삽입할 이미지 1장을 생성해 base64 data URI로 반환한다.
 */
export async function generateEditorImage(prompt: string, apiKey: string): Promise<string> {
  // 인물이 등장할 수 있는 프롬프트라 루트 CLAUDE.md 불변의 핵심 원칙 3번(기본은 한국인/
  // 동아시아인 묘사, 해외 유명인·정치인·연예인·운동선수이거나 해외 배경이 명시된 경우에만
  // 예외)을 반영한다.
  const fullPrompt = `Create a single photorealistic photo for a blog post. Scene: ${prompt}. If human figures appear, depict realistic Korean/East Asian individuals by default — only depict a different ethnicity when the subject explicitly names a foreign celebrity, politician, athlete, or a foreign country/setting central to the scene. One unified scene in a single frame, not a collage, not a split screen, not multiple panels. Photorealistic, documentary-quality photography, natural lighting, 16:9, no visible text, no watermark.`

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ['Image'], temperature: 0.7 },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`이미지 생성에 실패했습니다. (${response.status}) ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const part = data.candidates?.[0]?.content?.parts?.[0]
  const base64 = part?.inlineData?.data
  const mimeType = part?.inlineData?.mimeType || 'image/png'

  if (!base64) throw new Error('이미지 생성 결과를 받지 못했습니다.')

  return `data:${mimeType};base64,${base64.replace(/\s+/g, '')}`
}
