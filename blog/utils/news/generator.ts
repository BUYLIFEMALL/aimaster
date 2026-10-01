import { CollectedNewsResult } from './collector'
import { mdLiteToHtml, estimateReadingMinutes, extractExcerpt, formatReadableParagraphs } from '@/blog/utils/markdown'
import { generateNanoBananaImages } from './imageGenerator'
import type { GeneratedImagesResult } from './imageGenerator'
import { generateContentJson } from '@/blog/utils/ai/contentJson'
import { DEFAULT_CONTENT_PROVIDER, resolveContentModel, type ContentProvider } from '@/blog/utils/ai/contentModels'

/** 이미지 생성에 실패한 칸은 빈 이미지 태그를 남기지 않는다. */
function imageLine(alt: string, url: string): string {
  return url ? `![${alt}](${url})` : ''
}

// 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션은 2026-10-01 주인님 지시("이미지 프롬프트 섹션은 이제 안 보여줘도 돼")로 더 이상 만들지 않는다.
// 이미 저장된 글의 섹션은 utils/stripImageSchema.ts의 removeImagePromptSection()이 화면·편집기에서 걷어낸다.

export interface AutoPostOptions {
  topic: string
  categorySlug?: string
  tone?: string
  targetAudience?: string
  wordCount?: number
  keywords?: string[]
  referenceUrls?: string[]
  customInstructions?: string
  /** 본문 생성 플랫폼·모델·본인 키 (SEO 스튜디오와 같은 선택지, utils/ai/contentModels.ts) */
  contentProvider?: ContentProvider
  contentModel?: string
  contentApiKey?: string
  /** 이미지 생성용 본인 Gemini 키 */
  nanoBananaApiKey?: string
  nanoBananaEndpoint?: string
  imageModel?: string
  /** 이미지를 저장할 회원 id(Supabase Storage post-images/<id>/ai-auto-blog/) */
  storageUserId: string
  cta?: {
    text: string
    url: string
  }
}

export interface GeneratedPostResult {
  title: string
  excerpt: string
  contentMarkdown: string
  contentHtml: string
  readingMinutes: number
  categorySlug: string
  topKeywords: string[]
}

function generateHashtags(topic: string, keywords: string[], parsedJson?: any): string {
  const candidateSet = new Set<string>()

  const topicWords = topic.replace(/[^\w\s가-힣]/g, ' ').split(/\s+/).filter((w) => w.length >= 2)
  topicWords.forEach((w) => candidateSet.add(w))

  if (keywords && keywords.length > 0) {
    keywords.forEach((k) => {
      const clean = k.replace(/[^\w가-힣]/g, '').trim()
      if (clean.length >= 2) candidateSet.add(clean)
    })
  }

  if (parsedJson) {
    ;['소제목 1', '소제목 2', '소제목 3', '소제목 4'].forEach((key) => {
      if (parsedJson[key]) {
        const words = parsedJson[key]
          .replace(/[^\w\s가-힣]/g, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length >= 2 && !/^(완벽|가이드|분석|전망|소개|관련|핵심|장점|활용|파급|효과)$/.test(w))
        words.forEach((w: string) => candidateSet.add(w))
      }
    })
  }

  const defaultExts = ['시장전망', '기술혁신', '트렌드분석', '핵심요약', '비즈니스전략', '정책분석', '경제전망']
  defaultExts.forEach((e) => candidateSet.add(e))

  const tags = Array.from(candidateSet)
    .slice(0, 10)
    .map((t) => `#${t}`)
  return tags.join(' ')
}

async function generateWithContentModel(
  newsData: CollectedNewsResult,
  options: AutoPostOptions,
  apiKey: string
): Promise<{ title: string; excerpt: string; contentMarkdown: string }> {
  const keywordsList = options.keywords && options.keywords.length > 0
    ? options.keywords.slice(0, 5)
    : newsData.topKeywords.slice(0, 5)

  const mainKeyword = keywordsList[0] || options.topic
  const subKey1 = keywordsList[1] || `${options.topic} 트렌드`
  const subKey2 = keywordsList[2] || `${options.topic} 핵심 장점`
  const subKey3 = keywordsList[3] || `${options.topic} 실전 활용`
  const subKey4 = keywordsList[4] || `${options.topic} 파급 효과`

  const toneRule = options.tone ? `- 글 분위기 (Tone): '${options.tone}' 어조와 문체로 작성하세요.` : ''
  const audienceRule = options.targetAudience ? `- 대상 독자 (Target Audience): '${options.targetAudience}' 독자층을 염두에 두고 맞춤형 용어와 어조로 작성하세요.` : ''
  const wordCountRule = options.wordCount ? `- 목표 단어 수 (Word Count): 약 ${options.wordCount}단어 (공백 제외 약 ${Math.round(options.wordCount * 3.5)}자 이상)로 풍부하게 작성하세요.` : ''
  const referenceRule = options.referenceUrls && options.referenceUrls.length > 0 ? `- 참고 URL: ${options.referenceUrls.join(', ')}` : ''
  const customRule = options.customInstructions ? `- 추가 필수 지시사항 (Custom Instructions): ${options.customInstructions} (★ 이 지침을 최우선으로 반영할 것)` : ''

  const prompt = `
당신은 대한민국 최고의 SEO 블로그 전문 에디터입니다.
구글과 네이버 검색엔진이 선호하는 고품질 SEO 맞춤 포스트를 지정된 JSON 형식으로 생성해 주세요.

[주제 및 키워드 정보]:
- 주제: ${options.topic}
- 메인 키워드: ${mainKeyword}
- 서브 키워드1: ${subKey1}
- 서브 키워드2: ${subKey2}
- 서브 키워드3: ${subKey3}

[24시간 실시간 뉴스 컨텍스트]:
${newsData.summaryPromptContext}

[사용자 세부 맞춤 옵션 지침]:
${toneRule}
${audienceRule}
${wordCountRule}
${referenceRule}
${customRule}

[★ 글쓰기 필수 요구 규칙]:
1. 제목: 매력적이고 SEO에 적합하며 관련 키워드가 자연스럽게 조합된 제목으로 작성하세요.
2. 소제목 및 문단 구성: { "제목", "요약글", "소제목 1", "소제목 2", "소제목 3", "문단 1", "문단 2", "문단 3" } 3개의 독립적인 소제목과 문단으로 구성하세요.
3. 태그 사용 필수 룰:
   - 각 문단의 소제목("소제목 1", "소제목 2", "소제목 3")은 마크다운 ## (<h2>) 태그로 표현됩니다.
   - 글 전체 내용 중 구체적 세부 설명 부분에 마크다운 ### (<h3>) 태그를 정확히 3번 사용하세요.
   - 글 전체 내용 중 리스트 또는 핵심 질문/답변 목록 부분에 마크다운 - (<li>) 태그를 2번 이상 사용하세요.
4. 분량 및 딥다이브 설명:
   - 각 문단("문단 1", "문단 2", "문단 3")은 구체적인 정보, 설명, 풍부한 예시를 포함하여 총 전체 글자 수가 공백 제외 2,000자 이상이 되도록 길고 풍부하게 작성하세요.
5. 가독성 및 톤앤매너:
   - 정보성 글을 작성하되, 사람들이 끝까지 읽기 편하도록 대학생 수준에서 편하게 읽을 수 있는 명확하고 친절한 어조로 작성하세요.
   - 구글 검색 사용자의 검색 의도를 고려하여 질의-답변(Q&A) 구조와 명쾌한 해결책을 제시하세요.
   - 2~3문장마다 줄바꿈(\n\n)을 넣어 가독성을 극대화하세요.

[필수 지침 - JSON 출력 구조]:
아래 8개 키를 포함하는 순수한 JSON 형식으로 출력하세요 (추가 설명/마크다운 백틱 없이 순수 JSON만 출력):
{
  "제목": "매력적이고 SEO에 최적화된 포스트 제목",
  "요약글": "핵심 내용을 요약한 2~3문장 서술",
  "소제목 1": "${subKey1} 관련 매력적인 1번 소제목",
  "소제목 2": "${subKey2} 관련 매력적인 2번 소제목",
  "소제목 3": "${subKey3} 관련 매력적인 3번 소제목",
  "문단 1": "소제목 1에 해당하는 구체적이고 풍부한 설명, 예시, H3 및 LI 태그 포함 문단 (2~3문장마다 \n\n 줄바꿈)",
  "문단 2": "소제목 2에 해당하는 구체적이고 풍부한 설명, 예시, H3 및 LI 태그 포함 문단 (2~3문장마다 \n\n 줄바꿈)",
  "문단 3": "소제목 3에 해당하는 구체적이고 풍부한 설명, 예시, H3 및 LI 태그 포함 문단 (2~3문장마다 \n\n 줄바꿈)"
}
`.trim()

  // 회원이 고른 본문 생성 플랫폼·모델로 호출한다(SEO 스튜디오와 같은 어댑터). 실패하면 예전처럼 틀에 박힌 기본 글로
  // 조용히 대체하지 않고 오류를 그대로 올려 화면에 알린다(2026-10-01).
  const provider = options.contentProvider ?? DEFAULT_CONTENT_PROVIDER
  const model = resolveContentModel(provider, options.contentModel)
  console.log(`[AI Post Generator] content model: ${provider} / ${model}`)
  const parsed = (await generateContentJson({
    provider,
    apiKey,
    model,
    system: '당신은 대한민국 최고의 SEO 블로그 전문 에디터입니다. 요청한 JSON 형식만 출력합니다.',
    user: prompt,
  })) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

  const title = parsed['제목'] || `[SEO] ${options.topic} 완벽 가이드`
  const excerpt = parsed['요약글'] || `${options.topic}에 관한 심층 분석 리포트입니다.`

  const body1Text = formatReadableParagraphs(parsed['문단 1'] || parsed['1문단'] || '')
  const body2Text = formatReadableParagraphs(parsed['문단 2'] || parsed['2문단'] || '')
  const body3Text = formatReadableParagraphs(parsed['문단 3'] || parsed['3문단'] || '')

  const hashtags = generateHashtags(options.topic, keywordsList, parsed)

  // ★ [핵심] 생성된 3개 문단의 본문 내용을 정독하여 각각 100% 매칭되는 독창적 3개 영문 프롬프트 생성 후 이미지 매핑
  console.log('[AI Post Generator] Analyzing 3 paragraph contents to create 100% matching unique image prompts...')
  const images = await generateNanoBananaImages(
    options.topic,
    keywordsList,
    options.nanoBananaApiKey,
    options.imageModel,
    options.nanoBananaEndpoint,
    {
      title,
      excerpt,
      body1Text,
      body2Text,
      body4Text: body3Text,
    },
    options.storageUserId,
  )

  const contentMarkdown = `
> **요약**: ${excerpt}

## ${parsed['소제목 1'] || subKey1}

${imageLine(`${parsed['소제목 1'] || subKey1} 비주얼`, images.headerImage)}

${body1Text}

## ${parsed['소제목 2'] || subKey2}

${imageLine(`${parsed['소제목 2'] || subKey2} 비주얼`, images.bodyImage1)}

${body2Text}

## ${parsed['소제목 3'] || subKey3}

${imageLine(`${parsed['소제목 3'] || subKey3} 비주얼`, images.bodyImage2)}

${body3Text}

${
  options.cta?.text && options.cta?.url
    ? `
---

> ### 📢 ${options.cta.text}
> 
> 지금 바로 확인해 보세요: [👉 ${options.cta.text} 바로가기](${options.cta.url})
`
    : ''
}

---

${hashtags}
`.trim()

  return { title, excerpt, contentMarkdown }
}

export async function generateAutoPost(
  newsData: CollectedNewsResult,
  options: AutoPostOptions
): Promise<GeneratedPostResult> {
  // 본문은 회원이 고른 플랫폼의 본인 키(contentApiKey), 이미지는 본인 Gemini 키(nanoBananaApiKey)로만 만든다.
  // 키 확인은 app/api/auto-post/route.ts가 먼저 한다. 예전엔 생성이 실패하면 AI 없이 틀에 박힌 "24h 심층 분석" 기본 글을
  // 대신 저장했는데, 실제 생성 결과처럼 보여 오해를 낳아 없앴다 — 실패하면 오류를 화면에 알린다(2026-10-01).
  if (!options.contentApiKey) throw new Error('본문 생성용 API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요.')
  const postData = await generateWithContentModel(newsData, options, options.contentApiKey)

  const contentHtml = mdLiteToHtml(postData.contentMarkdown)
  const readingMinutes = estimateReadingMinutes(postData.contentMarkdown)
  const categorySlug = options.categorySlug || inferCategorySlug(options.topic, newsData.topKeywords)

  return {
    title: postData.title,
    excerpt: postData.excerpt,
    contentMarkdown: postData.contentMarkdown,
    contentHtml,
    readingMinutes,
    categorySlug,
    topKeywords: newsData.topKeywords,
  }
}

export const generateSeoPost = generateAutoPost;

function inferCategorySlug(topic: string, keywords: string[]): string {
  const topicLower = (topic + ' ' + keywords.join(' ')).toLowerCase()

  if (/react|next\.js|frontend|프론트/i.test(topicLower)) return 'react'
  if (/rust|wasm/i.test(topicLower)) return 'rust'
  if (/devops|ci\/cd|pipeline|인프라/i.test(topicLower)) return 'devops'
  if (/k8s|kubernetes|쿠버네티스/i.test(topicLower)) return 'kubernetes'
  if (/typescript|타입스크립트/i.test(topicLower)) return 'typescript'
  if (/javascript|자바스크립트/i.test(topicLower)) return 'javascript'
  if (/go|golang/i.test(topicLower)) return 'go'
  if (/docker|도커/i.test(topicLower)) return 'docker'
  if (/database|db|sql|postgresql|supabase/i.test(topicLower)) return 'database'
  if (/security|보안|인증|auth/i.test(topicLower)) return 'security'
  if (/performance|성능|최적화/i.test(topicLower)) return 'performance'

  return 'architecture'
}
