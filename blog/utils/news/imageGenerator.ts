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
import { uploadDataUriToCloudinary, type CloudinaryConfig } from '../cloudinary'

export interface GeneratedImagesResult {
  headerImage: string
  bodyImage1: string
  bodyImage2: string
  headerPrompt: string
  body1Prompt: string
  body2Prompt: string
  /** 각 이미지가 표현한 본문 핵심 문장(원문 그대로) */
  headerSentence: string
  body1Sentence: string
  body2Sentence: string
}

export interface ArticleContext {
  title: string
  excerpt: string
  body1Text: string
  body2Text: string
  body4Text: string
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
 * 섹션(문단) 3개에서 각각 그림으로 표현할 핵심 문장 1개를 원문 그대로 고르고, 그 문장만 담은 영어 장면 설명을 만든다.
 * SEO 스튜디오 selectContentVisuals()와 같은 지시문을 쓰되, BLOG는 회원 Gemini 키 하나로 동작하도록 Gemini로 호출한다.
 */
export async function selectSectionVisuals(
  topic: string,
  articleCtx: ArticleContext,
  apiKey: string,
): Promise<{ headerVisual: SectionVisual; body1Visual: SectionVisual; body2Visual: SectionVisual }> {
  const sections = [articleCtx.body1Text, articleCtx.body2Text, articleCtx.body4Text]
  const fallback = () => ({
    headerVisual: fallbackVisual(sections[0], topic),
    body1Visual: fallbackVisual(sections[1], topic),
    body2Visual: fallbackVisual(sections[2], topic),
  })

  const instruction = `You are a Korean blog visual editor. Return JSON only.
For EACH of the 3 sections below, choose exactly one complete sentence from THAT section: a meaningful, visually depictable key sentence. Copy the sentence exactly as written (Korean). The 3 sentences must be different.
For each chosen sentence, write one detailed English prompt for a single photorealistic 16:9 editorial scene that expresses only that sentence: concrete subject, action, place, time of day, lighting and camera framing.
Depict realistic Korean/East Asian people by default where people are appropriate; only depict another ethnicity when the sentence names a foreign celebrity, politician, entertainer or athlete, or a foreign country/setting central to it.
No text, logo, watermark, collage, split screen, infographic, illustration, or made-up facts.
Do not ask for readable text in the scene (no "Korean text", form fields, chart labels, names or numbers); describe screens and documents as blurred or abstract. ${NO_LEGIBLE_TEXT_RULE}
Format: {"visuals":[{"sentence":"...","prompt":"..."},{"sentence":"...","prompt":"..."},{"sentence":"...","prompt":"..."}]}

Topic: ${topic}
Title: ${articleCtx.title}

[Section 1]
${sections[0].slice(0, 4000)}

[Section 2]
${sections[1].slice(0, 4000)}

[Section 3]
${sections[2].slice(0, 4000)}`

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
    const items = (parsed.visuals ?? []).slice(0, 3)
    const visuals = items.map((item, index) => {
      const sentence = cleanSentence(item.sentence)
      const prompt = cleanPrompt(item.prompt)
      const inSection = sentence && normalizeForMatch(sections[index]).includes(normalizeForMatch(sentence))
      return inSection && prompt ? { sentence, prompt } : fallbackVisual(sections[index], topic)
    })
    while (visuals.length < 3) visuals.push(fallbackVisual(sections[visuals.length], topic))
    return { headerVisual: visuals[0], body1Visual: visuals[1], body2Visual: visuals[2] }
  } catch (err) {
    console.warn('[section-visuals] Gemini response parsing failed; using body fallback', err)
    return fallback()
  }
}

/** 나노바나나 1장 생성 → data URI(또는 회원 Cloudinary 설정이 있으면 업로드 URL). 실패하면 빈 문자열. */
async function generateSceneImage(
  sceneDescription: string,
  model: string,
  sceneType: 'header' | 'body1' | 'body2',
  apiKey: string,
  customEndpoint?: string,
  cloudinaryConfig?: CloudinaryConfig,
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
    const dataUri = `data:${imagePart.mimeType || 'image/png'};base64,${imagePart.data.replace(/\s+/g, '')}`
    console.log(`[Gemini Image OK (${config.modelName} ${config.imageSize} / ${sceneType})]: ${dataUri.length} bytes`)

    if (cloudinaryConfig) {
      try {
        return await uploadDataUriToCloudinary(dataUri, cloudinaryConfig)
      } catch (uploadErr) {
        console.error(`[Cloudinary Upload Failed (${sceneType})]:`, uploadErr)
        // 업로드 실패 시 base64를 그대로 사용해 글 생성 자체는 막지 않음
      }
    }
    return dataUri
  } catch (error) {
    console.error(`[Gemini Image API Call Error (${sceneType})]:`, error)
    return ''
  }
}

export async function generateNanoBananaImages(
  topic: string,
  _keywords: string[] = [],
  apiKey?: string,
  model: NanoBananaModelType = 'nanobanana-2-2k',
  customEndpoint?: string,
  articleCtx?: ArticleContext,
  cloudinaryConfig?: CloudinaryConfig,
): Promise<GeneratedImagesResult> {
  const empty: GeneratedImagesResult = {
    headerImage: '',
    bodyImage1: '',
    bodyImage2: '',
    headerPrompt: '',
    body1Prompt: '',
    body2Prompt: '',
    headerSentence: '',
    body1Sentence: '',
    body2Sentence: '',
  }
  // 회원 본인 키가 없으면 이미지를 만들지 않는다(운영자 키 폴백 금지). 호출부(auto-post)가 키를 먼저 확인한다.
  if (!apiKey) return empty

  const ctx: ArticleContext = articleCtx ?? { title: topic, excerpt: '', body1Text: topic, body2Text: topic, body4Text: topic }
  const { headerVisual, body1Visual, body2Visual } = await selectSectionVisuals(topic, ctx, apiKey)
  console.log(`[NanoBanana Pipeline] model "${model}" → ${getNanoBananaConfig(model).modelName}`)

  const headerImage = await generateSceneImage(headerVisual.prompt, model, 'header', apiKey, customEndpoint, cloudinaryConfig)
  await delay(200)
  const bodyImage1 = await generateSceneImage(body1Visual.prompt, model, 'body1', apiKey, customEndpoint, cloudinaryConfig)
  await delay(200)
  const bodyImage2 = await generateSceneImage(body2Visual.prompt, model, 'body2', apiKey, customEndpoint, cloudinaryConfig)

  return {
    headerImage,
    bodyImage1,
    bodyImage2,
    headerPrompt: headerVisual.prompt,
    body1Prompt: body1Visual.prompt,
    body2Prompt: body2Visual.prompt,
    headerSentence: headerVisual.sentence,
    body1Sentence: body1Visual.sentence,
    body2Sentence: body2Visual.sentence,
  }
}
