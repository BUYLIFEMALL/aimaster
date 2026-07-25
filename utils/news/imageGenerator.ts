/**
 * 나노바나나(NanoBanana) / 제미나이(Gemini) 공식 REST API 직접 호출 파이프라인
 */

import { getNanoBananaConfig } from './nanoBananaConfig'

export interface GeneratedImagesResult {
  headerImage: string
  bodyImage1: string
  bodyImage2: string
  headerPrompt: string
  body1Prompt: string
  body2Prompt: string
  headerSchema: string
  body1Schema: string
  body2Schema: string
}

export interface SingleImageFetchResult {
  imageUrl: string
  schemaText: string
}

export interface ArticleContext {
  title: string
  excerpt: string
  body1Text: string
  body2Text: string
  body4Text: string
}

export type NanoBananaModelType = 'nanobanana' | 'nanobanana-2-2k' | 'nanobanana-2-4k' | 'nanobanana-2' | 'nanobanana-pro' | string

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function cleanAsciiPrompt(text: string): string {
  return text
    .replace(/[가-힣]/g, ' ')
    .replace(/[^a-zA-Z0-9\s,.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 프롬프트 문맥 100% 반영 실시간 AI 백업 엔진 (무작위 CDN이 아닌 실제 영문 프롬프트를 100% 그려내는 AI 엔진)
 */
function getContextualAiImageUrl(promptText: string, width: number, height: number, seed: number): string {
  const cleanPrompt = cleanAsciiPrompt(promptText)
  const encodedPrompt = encodeURIComponent(cleanPrompt.slice(0, 200))
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`
}

async function verifyImageReady(
  imageUrl: string,
  promptText: string,
  sceneType: 'header' | 'body1' | 'body2',
  width: number,
  height: number,
  seed: number
): Promise<string> {
  if (imageUrl.startsWith('data:image')) {
    console.log(`[Base64 Inline Image Generated (${sceneType})]: Size = ${imageUrl.length} bytes`)
    return imageUrl
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)

  try {
    const res = await fetch(imageUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-100' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok || res.status === 206) {
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('image') || res.status === 200 || res.status === 206) {
        console.log(`[Verified Image 200 OK (${sceneType})]: ${imageUrl.slice(0, 65)}...`)
        return imageUrl
      }
    }
  } catch {
    clearTimeout(timeoutId)
    console.log(`[Image Timeout/Fallback (${sceneType})]: Using contextual AI engine`)
  }

  return getContextualAiImageUrl(promptText, width, height, seed)
}

/**
 * ★ [핵심] 생성 완료된 본문 전체 텍스트를 정독 및 이해하여 100% 문맥 매칭 영문 프롬프트 3개를 생성하는 AI Visual Director
 */
export async function generateArticleBasedImagePrompts(
  topic: string,
  articleCtx: ArticleContext,
  apiKey?: string
): Promise<{ headerPrompt: string; body1Prompt: string; body2Prompt: string }> {
  const activeKey = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NANOBANANA_API_KEY || ''

  if (activeKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${activeKey}`
      const promptInstruction = `You are a world-class award-winning National Geographic & Commercial Photographer.
Analyze each of the 3 specific paragraphs of this Korean blog post carefully:

[Article Title]: ${articleCtx.title}
[Paragraph 1 - Section 1]: ${articleCtx.body1Text.slice(0, 500)}
[Paragraph 2 - Section 2]: ${articleCtx.body2Text.slice(0, 500)}
[Paragraph 3 - Section 3]: ${articleCtx.body4Text.slice(0, 500)}

Your Task:
Create 3 ultra-high quality, ultra-realistic PHOTOREALISTIC REAL-LIFE PHOTOGRAPHY prompts in English (NO artwork, NO illustrations, NO infographics, NO 3D renders, NO anime).
Each prompt must 100% accurately capture the real-world scene, environment, real people/objects, natural lighting, and story of Paragraph 1, Paragraph 2, and Paragraph 3 respectively.

Rules:
1. MANDATORY PHOTOREALISM: Describe authentic real-world photography shots. Specify real camera lenses (e.g. 35mm lens, 85mm portrait, Hasselblad, sharp focus, natural volumetric studio lighting, high resolution, 8k).
2. Paragraph 1 Prompt: Create a dramatic real-world photographic scene visually depicting Paragraph 1.
3. Paragraph 2 Prompt: Create a sharp, ultra-detailed real-world photographic scene visually depicting Paragraph 2.
4. Paragraph 3 Prompt: Create a cinematic real-world photographic scene visually depicting Paragraph 3.
5. STRICTLY FORBID: Do NOT use words like "illustration", "infographic", "drawing", "3D render", "vector", "artistic".
6. Return PURE JSON format only without markdown ticks:
{
  "headerPrompt": "Ultra-realistic 8k photo of [real scene describing Paragraph 1], taken with 35mm lens, natural lighting, sharp details",
  "body1Prompt": "Ultra-realistic 8k photo of [real scene describing Paragraph 2], taken with 85mm lens, depth of field, sharp focus",
  "body2Prompt": "Ultra-realistic 8k photo of [real scene describing Paragraph 3], cinematic lighting, high-end commercial photography"
}`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptInstruction }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          if (parsed.headerPrompt && parsed.body1Prompt && parsed.body2Prompt) {
            console.log('[AI Photo Director] 3 Photorealistic Paragraph-Matched Prompts Created:')
            console.log('- Header (Para 1) Photo Prompt:', parsed.headerPrompt)
            console.log('- Body1 (Para 2) Photo Prompt:', parsed.body1Prompt)
            console.log('- Body2 (Para 3) Photo Prompt:', parsed.body2Prompt)
            return {
              headerPrompt: cleanAsciiPrompt(parsed.headerPrompt + ', award winning real photo, Hasselblad 8k, sharp focus, 16:9'),
              body1Prompt: cleanAsciiPrompt(parsed.body1Prompt + ', award winning real photo, Hasselblad 8k, sharp focus, 16:9'),
              body2Prompt: cleanAsciiPrompt(parsed.body2Prompt + ', award winning real photo, Hasselblad 8k, sharp focus, 16:9'),
            }
          }
        }
      }
    } catch (err) {
      console.error('[AI Photo Director Error]:', err)
    }
  }

  // Fallback (Ultra Photorealistic)
  return {
    headerPrompt: cleanAsciiPrompt(`Ultra-realistic 8k photograph of real world ${topic} scene, 35mm lens, natural lighting, Hasselblad, sharp focus, 16:9`),
    body1Prompt: cleanAsciiPrompt(`Ultra-realistic 8k detailed photograph of real world ${topic} technology and practical scene, 85mm lens, sharp focus, 16:9`),
    body2Prompt: cleanAsciiPrompt(`Ultra-realistic 8k cinematic photograph of real world ${topic} environment and people, cinematic lighting, high-end photography, 16:9`),
  }
}

async function fetchNanoBananaSingleImage(
  promptText: string,
  model: string,
  topic: string,
  sceneType: 'header' | 'body1' | 'body2',
  seed: number,
  apiKey?: string,
  customEndpoint?: string,
  width = 1200,
  height = 630
): Promise<SingleImageFetchResult> {
  const modelConfig = getNanoBananaConfig(model)
  const activeKey = apiKey || process.env.NANOBANANA_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  const baseEndpoint = customEndpoint || modelConfig.endpoint
  const targetUrl = activeKey ? `${baseEndpoint}?key=${activeKey}` : baseEndpoint

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['Image'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: modelConfig.imageSize
      },
      temperature: modelConfig.temperature || 0.7
    }
  }

  const schemaText = JSON.stringify(
    {
      targetUrl: targetUrl.replace(activeKey, activeKey ? 'PRESENT_API_KEY' : 'NO_KEY_PROVIDED'),
      httpMethod: 'POST',
      selectedModelType: model,
      officialModelName: modelConfig.modelName,
      resolutionConfig: modelConfig.imageSize,
      headers: {
        'Content-Type': 'application/json',
      },
      requestPayload: requestBody,
    },
    null,
    2
  )

  console.log(`\n=================== [Calling Official Gemini Image Endpoint (${sceneType}) - Model: ${modelConfig.modelName} (${modelConfig.imageSize})] ===================`)
  console.log(schemaText)
  console.log(`==================================================================================\n`)

  if (activeKey) {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        const part = data.candidates?.[0]?.content?.parts?.[0]
        const inlineBase64Raw = part?.inlineData?.data
        const mimeType = part?.inlineData?.mimeType || 'image/png'
        const imageUrl = part?.fileData?.fileUri || data.url || data.image_url

        if (inlineBase64Raw) {
          const cleanBase64 = inlineBase64Raw.replace(/\s+/g, '')
          const finalUrl = `data:${mimeType};base64,${cleanBase64}`
          console.log(`[Gemini Image Generated Successfully (${modelConfig.modelName} ${modelConfig.imageSize} / ${sceneType})]: Size = ${finalUrl.length} bytes`)
          return { imageUrl: finalUrl, schemaText }
        }

        if (imageUrl) {
          const verifiedUrl = await verifyImageReady(imageUrl, promptText, sceneType, width, height, seed)
          return { imageUrl: verifiedUrl, schemaText }
        }
      } else {
        const errText = await response.text()
        console.error(`[Gemini Image API Status ${response.status} (${sceneType})]:`, errText.slice(0, 300))
      }
    } catch (error) {
      console.error(`[Gemini Image API Call Error (${sceneType})]:`, error)
    }
  }

  const contextualAiUrl = getContextualAiImageUrl(promptText, width, height, seed)
  const verifiedUrl = await verifyImageReady(contextualAiUrl, promptText, sceneType, width, height, seed)
  return { imageUrl: verifiedUrl, schemaText }
}

export async function generateNanoBananaImages(
  topic: string,
  keywords: string[] = [],
  apiKey?: string,
  model: NanoBananaModelType = 'nanobanana-2-2k',
  customEndpoint?: string,
  articleCtx?: ArticleContext
): Promise<GeneratedImagesResult> {
  const modelConfig = getNanoBananaConfig(model)
  const uniqueTimestamp = Date.now()
  const baseSeed = uniqueTimestamp + Math.floor(Math.random() * 1000000)

  // ★ 1. 생성 완료된 본문 전체 텍스트를 AI Visual Director가 정독 후 3개 맞춤 영문 프롬프트 추출
  let prompts = {
    headerPrompt: cleanAsciiPrompt(`Photorealistic dramatic wide shot of ${topic}, high tech business setting, cinematic lighting, 4K, 16:9`),
    body1Prompt: cleanAsciiPrompt(`Photorealistic macro close-up of ${topic} technical architecture, digital twin microtexture, 4K, 16:9`),
    body2Prompt: cleanAsciiPrompt(`Photorealistic cinematic scene of ${topic} global future vision, dynamic urban background, 4K, 16:9`),
  }

  if (articleCtx) {
    prompts = await generateArticleBasedImagePrompts(topic, articleCtx, apiKey)
  }

  let headerWidth = 2048
  let headerHeight = 1080
  let bodyWidth = 1920
  let bodyHeight = 1080

  if (modelConfig.imageSize === '1K') {
    headerWidth = 1280
    headerHeight = 720
    bodyWidth = 1280
    bodyHeight = 720
  } else if (modelConfig.imageSize === '4K') {
    headerWidth = 3840
    headerHeight = 2160
    bodyWidth = 2560
    bodyHeight = 1440
  }

  console.log(`[NanoBanana Pipeline] Selected Model Option: "${model}" -> Official Model Name: "${modelConfig.modelName}", Endpoint: "${modelConfig.endpoint}", Resolution: "${modelConfig.imageSize}"`)

  const resHeader = await fetchNanoBananaSingleImage(prompts.headerPrompt, model, topic, 'header', baseSeed + 101, apiKey, customEndpoint, headerWidth, headerHeight)
  await delay(200)

  const resBody1 = await fetchNanoBananaSingleImage(prompts.body1Prompt, model, topic, 'body1', baseSeed + 505, apiKey, customEndpoint, bodyWidth, bodyHeight)
  await delay(200)

  const resBody2 = await fetchNanoBananaSingleImage(prompts.body2Prompt, model, topic, 'body2', baseSeed + 909, apiKey, customEndpoint, bodyWidth, bodyHeight)

  return {
    headerImage: resHeader.imageUrl,
    bodyImage1: resBody1.imageUrl,
    bodyImage2: resBody2.imageUrl,
    headerPrompt: prompts.headerPrompt,
    body1Prompt: prompts.body1Prompt,
    body2Prompt: prompts.body2Prompt,
    headerSchema: resHeader.schemaText,
    body1Schema: resBody1.schemaText,
    body2Schema: resBody2.schemaText,
  }
}
