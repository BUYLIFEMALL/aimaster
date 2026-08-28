import "server-only";

// 상품/상세페이지 이미지를 보고 핵심 소구점을 추출하는 기능. auto-detail-page(상세페이지
// 자동화)가 Claude Vision으로 "이미지를 보고 이해 + 콘텐츠 생성"을 한 번에 처리하는 방식을
// 참고했다. 다만 이 프로젝트는 캡션 생성에 OpenAI 키만 요구하고 있어서, 사용자가 provider
// 키를 추가로 등록하지 않아도 되도록 OpenAI의 비전 기능(gpt-4o-mini, 텍스트+이미지 멀티모달)
// 으로 구현한다 — 기능은 동일하고 필요한 키가 하나로 유지된다.

const VISION_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "당신은 이커머스 상품 마케팅 카피라이터입니다. 업로드된 상품/상세페이지 이미지와",
  "사용자가 제공한 텍스트 정보를 함께 보고, 이 상품을 쓰레드(Threads) 홍보 게시글로 만들 때",
  "쓸 수 있는 핵심 소구점을 뽑아내세요.",
  "",
  "반드시 아래 JSON 형식으로만 답하세요(다른 설명 문장 없이):",
  '{"productName": "이미지에서 파악한 상품명(간결하게)", "description": "상품을 2~3문장으로 요약한 설명", "keySellingPoints": ["소구점1", "소구점2", "소구점3"]}',
  "",
  "규칙:",
  "- productName은 이미지/텍스트에 이미 상품명이 있으면 그대로, 없으면 이미지를 보고 가장 적절한",
  "  상품명을 짧게 지어내세요(브랜드명+제품 종류 정도).",
  "- keySellingPoints는 3~5개, 각각 한 문장 이내로 짧게(예: \"24시간 로켓배송\", \"1+1 한정 특가\")",
  "- 이미지에 실제로 보이는 내용(디자인, 소재, 가격/할인 표시, 인증마크, 리뷰 수치 등)을",
  "  최대한 반영하세요 — 이미지에 없는 내용을 지어내지 마세요.",
  "- 사용자가 이미 입력한 상품명/설명이 있으면 그 맥락과 어긋나지 않게 보완하세요.",
].join("\n");

export interface ProductImageInput {
  base64: string;
  mimeType: string;
}

export interface ProductAppealAnalysis {
  productName: string;
  description: string;
  keySellingPoints: string[];
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
      text: contextLines.length > 0 ? contextLines.join("\n") : "아래 이미지를 보고 소구점을 분석해주세요.",
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

  let parsed: Partial<ProductAppealAnalysis>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 해석하지 못했습니다. 다시 시도해주세요.");
  }

  if (!parsed.description || !Array.isArray(parsed.keySellingPoints)) {
    throw new Error("AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.");
  }

  return {
    productName: String(parsed.productName ?? "").trim(),
    description: String(parsed.description).trim(),
    keySellingPoints: parsed.keySellingPoints.map((p) => String(p).trim()).filter(Boolean).slice(0, 5),
  };
}
