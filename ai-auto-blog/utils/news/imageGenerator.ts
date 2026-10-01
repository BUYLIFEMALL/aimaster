/**
 * 나노바나나(NanoBanana) / 제미나이(Gemini) 공식 REST API 직접 호출 파이프라인
 *
 * 2026-09-30 개편 — 네이버 블로그 SEO 스튜디오(naver-blog-seo-studio/lib/ai/contentVisuals.ts,
 * lib/ai/nanoBanana.ts)의 방식을 가져왔다(주인님 지시: "BLOG 원문 자동화의 이미지 퀄리티가 떨어진다").
 * - 예전: 문단 전체를 고정 시작 문구("adventure, courage…")·카메라 스펙·긴 부정어 블록을 붙인 초장문 프롬프트로
 *   바꾸고 한글·기호를 지운 뒤 생성 → 글 내용과 관계없는 비슷한 장면(사무실 사람들 등)이 반복되기 쉬웠다.
 * - 지금: 각 섹션에서 **그림으로 표현할 수 있는 핵심 문장 1개를 원문 그대로** 고르고, 그 문장만 담은 짧고 구체적인
 *   영어 장면 설명을 만들어 생성한다. 이미지 응답은 parts 중 inlineData가 있는 것을 찾아 쓴다(예전엔 parts[0]만 봤다).
 * - 운영자 환경변수 키 폴백·pollinations.ai 대체 이미지는 없앴다(루트 CLAUDE.md 핵심 원칙 4번 — 회원 본인 키만 사용,
 *   지어낸 결과 금지). 이미지 1장이 실패하면 그 칸은 비워 두고 글 생성은 계속한다.
 */

import { getNanoBananaConfig } from './nanoBananaConfig'
import { uploadBase64Image } from '../imageStorage'

/** 이미지 1장 결과 — 생성·저장에 실패하면 url은 빈 문자열(그 칸은 비움) */
export interface SegmentImage {
  url: string
  /** 사용한 영어 장면 설명 */
  prompt: string
  /** 이미지가 표현한 본문 핵심 문장(원문 그대로) */
  sentence: string
}

export type NanoBananaModelType = 'nanobanana' | 'nanobanana-2-2k' | 'nanobanana-2-4k' | 'nanobanana-2' | 'nanobanana-pro' | string

interface SectionVisual {
  sentence: string
  prompt: string
}

// 문장 선택·장면 설명용 텍스트 모델(회원 Gemini 키로 호출). 2026-09-30 모델 목록 조회로 제공 확인.
const VISUAL_DIRECTOR_MODEL = 'gemini-2.5-flash'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function cleanSentence(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 360) : ''
}

// 장면 설명은 길게 허용한다 — SEO 스튜디오처럼 360자에서 자르면 "Place: A futuris…"처럼 장소·조명 정보가 잘려
// 이미지 생성기에 전달되지 않았다(2026-09-30 실측).
function cleanPrompt(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 1500) : ''
}

// 원문 대조용: 글자·숫자만 남긴다. AI가 목록 기호("- ")를 빼거나 따옴표 모양(‘ ’ vs ', &#39;)·띄어쓰기를 바꿔 돌려주면
// 예전엔 원문에 없다고 탈락해 예비 문장으로 넘어갔다(2026-09-30 실측).
function normalizeForMatch(value: string): string {
  return value.replace(/&#?\w+;/g, '').replace(/[^\p{L}\p{N}]/gu, '')
}

// 화면·서류·간판에 글자를 그리면 알아볼 수 없는 가짜 한글이 잔뜩 들어간다(2026-09-30 실측) → 글자 없이 흐리게 표현하도록 지시.
const NO_LEGIBLE_TEXT_RULE =
  'Any screens, documents, signs or labels must show only blurred, abstract or out-of-focus content with no legible words, letters, numbers or UI text.'

function splitSentences(text: string): string[] {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? []
  return sentences.map(cleanSentence).filter((sentence) => sentence.length >= 20 && sentence.length <= 360)
}

function sentencePrompt(sentence: string): string {
  return `One photorealistic Korean blog editorial scene illustrating this exact Korean key sentence: ${sentence}. One unified scene, documentary-quality real-world photography, 16:9 landscape, no text, logo, watermark, collage, split screen, infographic, or illustration.`
}

/** AI 호출이 실패했을 때: 각 섹션 가운데쯤의 문장을 골라 같은 형식의 장면 설명을 만든다(외부 이미지로 대체하지 않음). */
function fallbackVisual(sectionText: string, topic: string): SectionVisual {
  const candidates = splitSentences(sectionText)
  const sentence = candidates[Math.floor(candidates.length / 2)] ?? cleanSentence(sectionText.slice(0, 240)) ?? topic
  return { sentence: sentence || topic, prompt: sentencePrompt(sentence || topic) }
}

/**
 * 구간(segment) N개에서 각각 그림으로 표현할 핵심 문장 1개를 원문 그대로 고르고, 그 문장만 담은 영어 장면 설명을 만든다.
 * 구간 = 이미지 1장이 들어갈 자리 앞뒤의 본문 덩어리(generator.ts가 이미지 장수에 맞춰 나눈다).
 * SEO 스튜디오 selectContentVisuals()와 같은 지시문을 쓰되, BLOG는 회원 Gemini 키 하나로 동작하도록 Gemini로 호출한다.
 */
export async function selectSegmentVisuals(
  topic: string,
  title: string,
  segments: string[],
  apiKey: string,
  labels: string[] = [],
): Promise<SectionVisual[]> {
  const fallback = () => segments.map((segment) => fallbackVisual(segment, topic))
  const count = segments.length
  const exampleItems = Array.from({ length: count }, () => '{"sentence":"...","prompt":"..."}').join(',')
  const sectionBlocks = segments
    .map((segment, index) => `[Section ${index + 1}${labels[index] ? ` — ${labels[index]}` : ''}]\n${segment.slice(0, 4000)}`)
    .join('\n\n')

  const instruction = `You are a Korean blog visual editor. Return JSON only.
For EACH of the ${count} sections below, choose exactly one complete sentence from THAT section: a meaningful, visually depictable key sentence. Copy the sentence exactly as written (Korean). The ${count} sentences must be different.
For each chosen sentence, write one detailed English prompt for a single photorealistic 16:9 editorial scene that expresses only that sentence: concrete subject, action, place, time of day, lighting and camera framing.
Depict realistic Korean/East Asian people by default where people are appropriate; only depict another ethnicity when the sentence names a foreign celebrity, politician, entertainer or athlete, or a foreign country/setting central to it.
No text, logo, watermark, collage, split screen, infographic, illustration, or made-up facts.
Do not ask for readable text in the scene (no "Korean text", form fields, chart labels, names or numbers); describe screens and documents as blurred or abstract. ${NO_LEGIBLE_TEXT_RULE}
Format: {"visuals":[${exampleItems}]}

Topic: ${topic}
Title: ${title}

${sectionBlocks}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VISUAL_DIRECTOR_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruction }] }],
          generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
        }),
      },
    )
    if (!response.ok) {
      console.warn('[section-visuals] Gemini sentence analysis failed; using body fallback', { status: response.status })
      return fallback()
    }
    const data = await response.json()
    const raw = data.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text
    if (!raw) return fallback()

    const parsed = JSON.parse(raw) as { visuals?: Array<{ sentence?: unknown; prompt?: unknown }> }
    const items = (parsed.visuals ?? []).slice(0, count)
    const visuals = items.map((item, index) => {
      const sentence = cleanSentence(item.sentence)
      const prompt = cleanPrompt(item.prompt)
      const inSection = sentence && normalizeForMatch(segments[index]).includes(normalizeForMatch(sentence))
      return inSection && prompt ? { sentence, prompt } : fallbackVisual(segments[index], topic)
    })
    while (visuals.length < count) visuals.push(fallbackVisual(segments[visuals.length], topic))
    return visuals
  } catch (err) {
    console.warn('[section-visuals] Gemini response parsing failed; using body fallback', err)
    return fallback()
  }
}

/** 나노바나나 1장 생성 → Supabase Storage(post-images)에 올린 공개 주소. 생성·저장에 실패하면 빈 문자열(그 칸은 비움). */
async function generateSceneImage(
  sceneDescription: string,
  model: string,
  sceneType: string,
  apiKey: string,
  customEndpoint: string | undefined,
  storageUserId: string,
): Promise<string> {
  const config = getNanoBananaConfig(model)
  // SEO 스튜디오 generateNanoBananaImage()와 같은 감싸는 문장.
  const prompt = `Create this exact editorial scene: ${sceneDescription} Depict realistic Korean/East Asian people by default unless the topic explicitly requires another setting. Use one unified scene, not a collage or split screen. Natural lighting, documentary-quality composition, 16:9 landscape, no visible text, no logo, no watermark. ${NO_LEGIBLE_TEXT_RULE}`

  try {
    const response = await fetch(`${customEndpoint || config.endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['Image'],
          imageConfig: { aspectRatio: '16:9', imageSize: config.imageSize },
          temperature: config.temperature,
        },
      }),
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[Gemini Image API ${response.status} (${sceneType})]:`, errText.replace(/AIza[\w-]{20,}/g, '[API 키 숨김]').slice(0, 300))
      return ''
    }
    const data = await response.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: { data?: string } }) => part.inlineData?.data,
    )?.inlineData
    if (!imagePart?.data) {
      console.error(`[Gemini Image (${sceneType})]: 이미지 결과 없음`)
      return ''
    }
    console.log(`[Gemini Image OK (${config.modelName} ${config.imageSize} / ${sceneType})]: ${imagePart.data.length} chars`)
    // 예전엔 Cloudinary가 없으면 base64를 글 본문에 그대로 넣었다(글 1개 12MB 이상). 이제 항상 Storage에 올리고 주소만 넣는다.
    // 저장에 실패하면 무거운 base64로 되돌리지 않고 그 칸을 비운다.
    try {
      return await uploadBase64Image(storageUserId, imagePart.data, imagePart.mimeType || 'image/png')
    } catch (uploadErr) {
      console.error(`[Storage Upload Failed (${sceneType})]:`, uploadErr)
      return ''
    }
  } catch (error) {
    console.error(`[Gemini Image API Call Error (${sceneType})]:`, error)
    return ''
  }
}

/** 구간마다 이미지 1장씩(=구간 수만큼) 만든다. 회원 본인 Gemini 키가 없으면 만들지 않는다(운영자 키 폴백 금지 — 호출부가 키를 먼저 확인). */
export async function generateSegmentImages(params: {
  topic: string
  title: string
  segments: string[]
  /** 구간 설명(예: "Whole article overview", "Paragraph 1: 소제목") — 문장 고르는 AI에 함께 전달 */
  segmentLabels?: string[]
  apiKey: string | undefined
  model?: NanoBananaModelType
  storageUserId: string
}): Promise<SegmentImage[]> {
  const { topic, title, segments, apiKey, storageUserId } = params
  const model = params.model || 'nanobanana-2-2k'
  if (!apiKey || segments.length === 0) return segments.map(() => ({ url: '', prompt: '', sentence: '' }))

  const visuals = await selectSegmentVisuals(topic, title, segments, apiKey, params.segmentLabels)
  console.log(`[NanoBanana Pipeline] ${segments.length} images, model "${model}" → ${getNanoBananaConfig(model).modelName}`)

  const results: SegmentImage[] = []
  for (const [index, visual] of visuals.entries()) {
    if (index > 0) await delay(200)
    const url = await generateSceneImage(visual.prompt, model, `image${index + 1}`, apiKey, undefined, storageUserId)
    results.push({ url, prompt: visual.prompt, sentence: visual.sentence })
  }
  return results
}
