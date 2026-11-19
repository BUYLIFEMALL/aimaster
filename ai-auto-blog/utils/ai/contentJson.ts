import 'server-only'
import type { ContentProvider } from './contentModels'
import { openAIGenerationParams } from './openaiRequestParams'

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
      ...openAIGenerationParams(model, { temperature: 0.65 }),
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    // 최신 모델 중 Chat Completions를 지원하지 않는 모델은 Responses API로 한 번 더 보낸다
    // (docs/AI_MODEL_INTEGRATION_STANDARD.md 3번 — 공식 지원 엔드포인트가 다를 수 있음).
    // 2026-11-19 (Master msg_bd0707fc7039): 모델·엔드포인트 전환 안내가 명시된 오류에서만 다시 보낸다.
    // 일반 옵션 오류(unsupported_parameter 등)·401/403/429/500에는 별도 호출 없이 실패로 둔다(이중 과금 방지).
    if (shouldSwitchToResponses(response.status, body)) {
      return generateOpenAIResponsesJson({ apiKey, model, system, user })
    }
    throw safeError('OpenAI', response.status, body)
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI가 본문 결과를 반환하지 않았습니다.')
  return extractJson(text)
}

/**
 * Chat Completions 거절을 Responses로 다시 보낼지 판단한다(순수 함수, 시험 대상).
 * 허용: 400/404이면서, 옵션 오류가 아니고(error.code unsupported_parameter/unsupported_value·error.param 없음),
 * 오류 문구가 Responses 엔드포인트를 쓰라고 하거나 이 모델이 Chat Completions를 지원하지 않는다고 명시한 경우.
 */
export function shouldSwitchToResponses(status: number, body: string): boolean {
  if (status !== 400 && status !== 404) return false
  let message = body
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown; code?: unknown; param?: unknown } }
    const err = parsed?.error
    if (err) {
      if (err.code === 'unsupported_parameter' || err.code === 'unsupported_value') return false
      if (typeof err.param === 'string' && err.param) return false
      if (typeof err.message === 'string') message = err.message
    }
  } catch {
    // JSON이 아니면 원문 그대로 검사
  }
  const mentionsResponses = /\bv1\/responses\b|responses api|\/v1\/responses/i.test(message)
  const chatUnsupported =
    /(chat\/completions|chat completions)[^.]{0,60}\b(not supported|unsupported|does not support)\b/i.test(message) ||
    /\b(not supported|unsupported)\b[^.]{0,60}(chat\/completions|chat completions)/i.test(message)
  return mentionsResponses || chatUnsupported
}

async function generateOpenAIResponsesJson(params: { apiKey: string; model: string; system: string; user: string }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model,
      instructions: params.system,
      input: params.user,
      text: { format: { type: 'json_object' } },
    }),
  })
  if (!response.ok) throw safeError('OpenAI', response.status, await response.text().catch(() => ''))
  const data = (await response.json()) as {
    output_text?: string
    output?: { content?: { type?: string; text?: string }[] }[]
  }
  const text = (
    data.output_text ??
    data.output?.flatMap((item) => item.content ?? []).filter((part) => part.type === 'output_text').map((part) => part.text ?? '').join('')
  )?.trim()
  if (!text) throw new Error('OpenAI가 본문 결과를 반환하지 않았습니다.')
  return extractJson(text)
}
