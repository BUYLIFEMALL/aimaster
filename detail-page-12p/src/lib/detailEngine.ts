import { GoogleGenAI, Type } from "@google/genai";
import { ProductInputData, DetailScene, PlatformType, ModelType } from "@/types/detail";

export interface AutoSearchResult {
  productName: string;
  category: string;
  specs: string[];
  description: string;
  targetAudience: string;
  toneAndManner: string;
  recommendedDiscount: number;
  eventBannerText: string;
  hookingPoints: string[];
}

/**
 * 1. 제품명 기반 1초 스펙/특징 자동 조사 엔진
 */
export async function autoSearchProductInfo(
  apiKey: string,
  productName: string
): Promise<AutoSearchResult> {
  const currentYear = new Date().getFullYear();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
당신은 대한민국 이커머스(쿠팡, 네이버 스마트스토어) 최고의 상품 기획 MD이자 마케팅 카피라이터입니다. (기준 연도: ${currentYear}년)
아래 제품명을 분석하여 소비자의 구매 전환율을 극대화할 수 있는 핵심 스펙, 매력적인 제품 설명, 타겟 고객, 톤앤매너, 이벤트 배너 문구를 작성해주세요.

[분석할 제품명]: "${productName}"

반드시 한국어로 자연스럽고 트렌디한 이커머스 상업용 문체로 작성해주세요.
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "정리된 공식 상품명" },
      category: { type: Type.STRING, description: "상품 카테고리" },
      specs: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "핵심 스펙 4~5개 (규격, 소재, 기능, 인증 등)",
      },
      description: { type: Type.STRING, description: "소비자를 사로잡는 제품 상세 설명 문구 3~4문장" },
      targetAudience: { type: Type.STRING, description: "핵심 타겟 고객층 (연령, 성별, 취향)" },
      toneAndManner: { type: Type.STRING, description: "추천 상세페이지 톤앤매너 (예: 모던&미니멀, 프리미엄 럭셔리 등)" },
      recommendedDiscount: { type: Type.INTEGER, description: "추천 프로모션 할인율 (%)" },
      eventBannerText: { type: Type.STRING, description: "상단 긴급 한정 프로모션 문구" },
      hookingPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "고객의 구매 욕구를 자극하는 3대 후킹 포인트",
      },
    },
    required: [
      "productName",
      "category",
      "specs",
      "description",
      "targetAudience",
      "toneAndManner",
      "recommendedDiscount",
      "eventBannerText",
      "hookingPoints",
    ],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("스펙 자동검색 응답을 받지 못했습니다.");
  }

  return JSON.parse(text) as AutoSearchResult;
}

/**
 * 2. 12단/9단 상세페이지 전체 카피 및 비주얼 프롬프트 기획 생성 엔진
 */
export async function generateDetailPageScenes(
  apiKey: string,
  input: ProductInputData
): Promise<DetailScene[]> {
  const currentYear = new Date().getFullYear();
  const ai = new GoogleGenAI({ apiKey });

  const totalCount = input.platform === "coupang" ? 12 : 9;

  const prompt = `
당신은 대한민국 최고의 이커머스 상세페이지 기획자이자 크리에이티브 디렉터입니다. (기준 연도: ${currentYear}년)
아래 제품 정보를 바탕으로 [${input.platform === "coupang" ? "쿠팡 로켓배송 규격 (12단 시퀀스)" : "네이버 스마트스토어 규격 (9단 시퀀스)"}]에 완벽하게 최적화된 총 ${totalCount}개 장면의 상세페이지 시퀀스를 기획해주세요.

[제품 기본 정보]:
- 상품명: ${input.productName}
- 가격 정보: 정상가 ${input.originalPrice ? input.originalPrice.toLocaleString() + '원' : '미정'} / 할인가 ${input.salePrice ? input.salePrice.toLocaleString() + '원' : '미정'} (${input.discountRate || 0}% 할인)
- 제품 설명: ${input.description || '최고급 사양'}
- 타겟 고객: ${input.targetAudience || '스마트 컨슈머'}
- 톤앤매너: ${input.toneAndManner || '모던 프리미엄'}
- 이벤트 문구: ${input.eventBannerText || '기간 한정 런칭 특가'}
- 업로드된 사양서 내용: ${input.specDocContent || '없음'}
- 제품 사진 등록 여부: ${input.productImages && input.productImages.length > 0 ? `${input.productImages.length}장의 실물 사진 제공됨` : '없음 (AI 생성 연출)'}

[시퀀스 구성 가이드]:
쿠팡(12단):
1. 프로모션/한정혜택 배너 (할인율, 혜택 강조)
2. 메인 후킹 (소비자 문제의식 자극, 공감 유도)
3. 대표컷 & 핵심 스펙 요약 (전면 비주얼 + 스펙 정리)
4. 특장점 01 (소재 / 성분 / 원료 차별점)
5. 특장점 02 (기능 / 성능 / 압도적 편의성)
6. 특장점 03 (디자인 / 감성 / 핏감 / 디테일)
7. 라이프스타일 컷 (실제 일상 공간/착용 연출)
8. 비교 우위 (일반 타사 제품 vs 자사 제품 차별점)
9. 초근접 매크로 디테일 (마감, 질감, 텍스처 초근접)
10. 실전 활용 팁 (단계별 사용 가이드)
11. 추천 고객 (이런 분께 강력 추천 4대 체크리스트)
12. 패키지 구성품 & 배송/FAQ 안심 보증

네이버 스마트스토어(9단):
1. 메인 후킹 & 프로모션 배너
2. 대표 비주얼 & 브랜드 스토리
3. 특장점 01 (핵심 소재/기능)
4. 특장점 02 (사용 편의성/디자인)
5. 라이프스타일 감성 연출
6. 비교 우위 팩트체크
7. 초근접 퀄리티 디테일
8. 추천 고객 체크리스트
9. 구성품 및 구매 안내/FAQ

[주의사항]:
- 모든 카피(title, subtitle, bodyText, keyPoints, badge)는 소비자의 지갑을 열게 만드는 세련되고 설득력 있는 한국어로 작성하세요.
- imagePrompt는 Nano Banana 및 Imagen 이미지 생성 AI가 정확하고 미려한 상업용 제품 사진을 렌더링할 수 있도록 매우 구체적인 영어 프롬프트로 작성하세요 (예: "Commercial studio product photography of [product], clean pure white background #ffffff, dramatic softbox lighting, 8k resolution, photorealistic macro details...").
- accentColor는 제품 무드에 어울리는 고급스러운 HEX 코드(예: "#2563EB", "#059669", "#EA580C", "#4F46E5", "#0F172A")를 지정하세요.
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER, description: "1부터 시작하는 순번" },
            sectionKey: { type: Type.STRING, description: "섹션 키 (예: promotion, hook, spec, feature1...)" },
            badge: { type: Type.STRING, description: "상단 배지 (예: POINT 01, HOT EVENT, CHECK)" },
            title: { type: Type.STRING, description: "메인 헤드라인 카피" },
            subtitle: { type: Type.STRING, description: "서브 카피" },
            bodyText: { type: Type.STRING, description: "본문 상세 설명 (2~3문장)" },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "핵심 체크포인트 불렛 3개",
            },
            imagePrompt: { type: Type.STRING, description: "상세페이지 렌더링용 영문 비주얼 프롬프트" },
            aspectRatio: { type: Type.STRING, description: "화면비율 (3:4, 1:1, 4:5 중 하나)" },
            accentColor: { type: Type.STRING, description: "포인트 HEX 컬러코드" },
          },
          required: [
            "index",
            "sectionKey",
            "badge",
            "title",
            "subtitle",
            "bodyText",
            "keyPoints",
            "imagePrompt",
            "aspectRatio",
            "accentColor",
          ],
        },
      },
    },
    required: ["scenes"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("상세페이지 기획 생성 응답을 받지 못했습니다.");
  }

  const parsed = JSON.parse(text) as { scenes: any[] };

  return parsed.scenes.map((s, idx) => ({
    id: `scene-${Date.now()}-${idx + 1}`,
    index: idx + 1,
    sectionKey: s.sectionKey || `scene-${idx + 1}`,
    badge: s.badge || `POINT ${idx + 1}`,
    title: s.title || "",
    subtitle: s.subtitle || "",
    bodyText: s.bodyText || "",
    keyPoints: s.keyPoints || [],
    imagePrompt: s.imagePrompt || "",
    aspectRatio: (s.aspectRatio === "1:1" ? "1:1" : s.aspectRatio === "4:5" ? "4:5" : "3:4") as any,
    accentColor: s.accentColor || "#2563EB",
    status: "pending",
  }));
}

/**
 * 3. 씬별 개별 이미지 렌더링 생성 엔진
 */
export async function generateSceneImage(
  apiKey: string,
  prompt: string,
  modelType: ModelType,
  referenceImages?: string[]
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [];

  // 레퍼런스 제품 사진이 있는 경우 멀티모달 주입
  if (referenceImages && referenceImages.length > 0) {
    for (const img of referenceImages.slice(0, 2)) {
      const base64Data = img.includes(",") ? img.split(",")[1] : img;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      });
    }
  }

  const enhancedPrompt = `
Commercial e-commerce product detail page scene photography.
Subject: ${prompt}
Visual Quality: Photorealistic, pristine studio lighting, crisp sharpness, professional product commercial standard, clean aesthetic background, 8k resolution, elegant composition, high-end e-commerce banner quality, no distorted texts.
`;

  parts.push({ text: enhancedPrompt });

  try {
    const response = await ai.models.generateContent({
      model: modelType === "nano-banana2" ? "gemini-3-pro-image-preview" : "gemini-2.5-flash",
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K",
        },
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (err: any) {
    console.warn("Primary image model failed, attempting fallback:", err.message);
  }

  // 폴백: imagen-3.0-generate-002
  try {
    const imagenRes = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "3:4",
        outputMimeType: "image/jpeg",
      },
    });

    if (imagenRes.generatedImages && imagenRes.generatedImages[0]?.image?.imageBytes) {
      return `data:image/jpeg;base64,${imagenRes.generatedImages[0].image.imageBytes}`;
    }
  } catch (err: any) {
    console.warn("Imagen fallback failed:", err.message);
  }

  // 추가 폴백: 에러 발생 시 사용자 친화적인 고해상도 프리미엄 SVG 제품 비주얼 카드 생성
  return generatePlaceholderVisual(prompt);
}

function generatePlaceholderVisual(prompt: string): string {
  const cleanPrompt = prompt.slice(0, 80).replace(/["<>]/g, "");
  const svg = `
<svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect width="600" height="800" fill="url(#grad)" />
  <rect x="50" y="80" width="500" height="640" rx="24" fill="#ffffff" filter="url(#shadow)" />
  <circle cx="300" cy="340" r="100" fill="#f1f5f9" />
  <path d="M260 380 L300 320 L340 380 Z" fill="#94a3b8" />
  <circle cx="320" cy="310" r="14" fill="#cbd5e1" />
  <text x="300" y="490" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="700" fill="#0f172a" text-anchor="middle">
    AI STUDIO HIGH-RESOLUTION SCENE
  </text>
  <text x="300" y="525" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">
    ${cleanPrompt}
  </text>
  <rect x="230" y="565" width="140" height="36" rx="18" fill="#2563eb" />
  <text x="300" y="588" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#ffffff" text-anchor="middle">
    12P PREVIEW
  </text>
</svg>
`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
