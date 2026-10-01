import 'server-only'
import type { ContentProvider } from './contentModels'

// 플랫폼별 JSON 글 생성 어댑터 — SEO 스튜디오 naver-blog-seo-studio/lib/ai/contentJson.ts와 같은 방식.
// 회원이 고른 플랫폼의 본인 키만 받는다(운영자 키 폴백 없음).

function extractJson(value: string): Record<string, unknown> {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(trimmed) as Record<string, unknown>
}

function safeError(provider: string, status: number, body: string) {
  const detail = body.replace(/AIza[\w-]{20,}|sk-[\w-]{20,}/g, '[API 키 숨김]').replace(/\s+/g, ' ').slice(0, 200)
  return new Error(`${provider} 글 생성 요청에 실패했습니다. (${status}${detail ? `: ${detail}` : ''})`)
}

export async function generateContentJson(params: {
  provider: ContentProvider
  apiKey: string
  model: string
  system: string
  user: string
}): Promise<Record<string, unknown>> {
  const { provider, apiKey, model, system, user } = params

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      // 한국어 장문(공백 제외 2,000자 이상) + JSON이라 넉넉하게 잡는다.
      body: JSON.stringify({ model, max_tokens: 12000, system, messages: [{ role: 'user', content: user }] }),
    })
    if (!response.ok) throw safeError('Claude', response.status, await response.text().catch(() => ''))
    const data = (await response.json()) as { content?: { type?: string; text?: string }[] }
    const text = data.content?.filter((block) => block.type === 'text').map((block) => block.text ?? '').join('').trim()
    if (!text) throw new Error('Claude가 본문 결과를 반환하지 않았습니다.')
    return extractJson(text)
  }

  if (provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )
    if (!response.ok) throw safeError('Gemini', response.status, await response.text().catch(() => ''))
    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
    if (!text) throw new Error('Gemini가 본문 결과를 반환하지 않았습니다.')
    return extractJson(text)
  }

  // GPT-5 이상은 temperature를 기본값만 허용하므로 GPT-4 계열에만 지정한다.
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...(model.startsWith('gpt-4') ? { temperature: 0.65 } : {}),
    }),
  })
  if (!response.ok) throw safeError('OpenAI', response.status, await response.text().catch(() => ''))
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI가 본문 결과를 반환하지 않았습니다.')
  return extractJson(text)
}
