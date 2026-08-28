import "server-only";

// 상품/상세페이지 이미지를 보고 상품 정보를 세분화해서 추출하는 기능. shop-detail-page
// (상세페이지 자동화, 별도 서브프로젝트 /products/new)의 "AI로 상품 분석하기" 결과 스키마
// (상품명/카테고리/가격/핵심특징/스펙/사용방법/타겟고객/디자인정보)를 그대로 참고해서
// 구성했다. 이 프로젝트는 캡션 생성에 OpenAI 키만 요구하고 있어서, 사용자가 provider 키를
// 추가로 등록하지 않아도 되도록 OpenAI의 비전 기능(gpt-4o-mini, 텍스트+이미지 멀티모달)으로
// 구현한다.

const VISION_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "당신은 이커머스 상품 분석 전문가입니다. 업로드된 상품/상세페이지 이미지와 사용자가 제공한",
  "텍스트 정보를 함께 보고, 아래 항목을 최대한 세분화해서 추출하세요.",
  "",
  "반드시 아래 JSON 형식으로만 답하세요(다른 설명 문장 없이):",
  JSON.stringify({
    productName: "상품명(간결하게)",
    category: "카테고리(예: 생활가전 > 소형가전)",
    regularPrice: "정상가(숫자+원, 모르면 빈 문자열)",
    discountPrice: "할인가(숫자+원, 할인 없으면 빈 문자열)",
    keyFeatures: ["핵심특징1", "핵심특징2", "핵심특징3"],
    specs: "스펙을 \"항목: 값\" 형태로 줄바꿈해서 나열한 문자열",
    howToUse: "사용방법을 문장/단계로 설명한 문자열",
    targetCustomer: "이 상품이 어울리는 타겟 고객층 설명 문자열",
    mainColor: "이미지에서 파악한 메인 컬러(예: 화이트)",
    subColor: "서브 컬러",
    backgroundStyle: "배경 스타일(예: 미니멀, 우드톤)",
    fontStyle: "어울리는 폰트 톤(예: 굵고 모던한 산세리프)",
    layoutDensity: "레이아웃 밀도(예: 여백이 많은 심플한 구성)",
    moodKeywords: ["분위기키워드1", "분위기키워드2"],
  }),
  "",
  "규칙:",
  "- productName은 이미지/텍스트에 이미 상품명이 있으면 그대로, 없으면 이미지를 보고 가장 적절한",
  "  상품명을 짧게 지어내세요(브랜드명+제품 종류 정도).",
  "- keyFeatures는 3~5개, 각각 한 문장 이내로 짧게(예: \"24시간 로켓배송\", \"1+1 한정 특가\")",
  "- moodKeywords는 2~4개, 짧은 단어/구 단위로.",
  "- 이미지에 실제로 보이는 내용(디자인, 소재, 가격/할인 표시, 인증마크, 리뷰 수치 등)을",
  "  최대한 반영하세요 — 이미지에 없는 내용을 지어내지 마세요. 확실하지 않은 항목은 빈",
  '  문자열("") 또는 빈 배열([])로 두세요.',
  "- 사용자가 이미 입력한 상품명/원본 정보가 있으면 그 맥락과 어긋나지 않게 보완하세요.",
].join("\n");

export interface ProductImageInput {
  base64: string;
  mimeType: string;
}

export interface ProductAppealAnalysis {
  productName: string;
  category: string;
  regularPrice: string;
  discountPrice: string;
  keyFeatures: string[];
  specs: string;
  howToUse: string;
  targetCustomer: string;
  mainColor: string;
  subColor: string;
  backgroundStyle: string;
  fontStyle: string;
  layoutDensity: string;
  moodKeywords: string[];
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean).slice(0, limit);
}

export async function analyzeProductAppeal(
  images: ProductImageInput[],
  context: { productName?: string | null; sourceText?: string | null },
  apiKey: string,
): Promise<ProductAppealAnalysis> {
  if (images.length === 0) {
    throw new Error("분석할 이미지를 1장 이상 업로드해주세요.");
  }

  const contextLines = [
    context.productName ? `상품명: ${context.productName}` : null,
    context.sourceText ? `상품 원본 정보: ${context.sourceText}` : null,
  ].filter(Boolean);

  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: contextLines.length > 0 ? contextLines.join("\n") : "아래 이미지를 보고 상품 정보를 분석해주세요.",
    },
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`이미지 분석에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  const raw = json.choices?.[0]?.message?.content ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 해석하지 못했습니다. 다시 시도해주세요.");
  }

  if (!parsed.productName && strArray(parsed.keyFeatures, 5).length === 0) {
    throw new Error("AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.");
  }

  return {
    productName: str(parsed.productName),
    category: str(parsed.category),
    regularPrice: str(parsed.regularPrice),
    discountPrice: str(parsed.discountPrice),
    keyFeatures: strArray(parsed.keyFeatures, 5),
    specs: str(parsed.specs),
    howToUse: str(parsed.howToUse),
    targetCustomer: str(parsed.targetCustomer),
    mainColor: str(parsed.mainColor),
    subColor: str(parsed.subColor),
    backgroundStyle: str(parsed.backgroundStyle),
    fontStyle: str(parsed.fontStyle),
    layoutDensity: str(parsed.layoutDensity),
    moodKeywords: strArray(parsed.moodKeywords, 4),
  };
}
