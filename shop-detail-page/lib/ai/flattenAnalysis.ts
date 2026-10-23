import type { RawProductAnalysis } from "./productAnalysisPrompt";

export interface FlatProductAnalysis {
  name: string;
  category: string;
  keyFeatures: string;
  specs: string;
  howToUse: string;
  targetCustomer: string;
  mainColor: string;
  subColor: string;
  backgroundStyle: string;
  moodKeywords: string[];
  fontStyle: string;
  layoutDensity: string;
}

/**
 * Gemini가 반환한 중첩 JSON(상세스펙/디자인정보는 object, 핵심특징 등은 array)을
 * shop_products 테이블의 평평한 text 컬럼 구조로 변환한다.
 * #1(이미지생성) 워크플로우의 Code 노드가 핵심특징을 `.split('\n')`으로 다시 쪼개 쓰므로,
 * 배열은 줄바꿈으로 합쳐야 downstream 로직과 호환된다.
 */
export function flattenProductAnalysis(raw: RawProductAnalysis): FlatProductAnalysis {
  const specs = raw.상세스펙
    ? Object.entries(raw.상세스펙)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : "";

  const moodRaw = raw.디자인정보?.분위기키워드;
  const moodKeywords = Array.isArray(moodRaw)
    ? moodRaw
    : typeof moodRaw === "string"
      ? moodRaw.split(/[,、]\s*/).filter(Boolean)
      : [];

  return {
    name: raw.상품명 ?? "",
    category: raw.카테고리 ?? "",
    keyFeatures: (raw.핵심특징 ?? []).join("\n"),
    specs,
    howToUse: (raw.사용방법 ?? []).join("\n"),
    targetCustomer: (raw.타겟고객 ?? []).join("\n"),
    mainColor: raw.디자인정보?.메인컬러 ?? "",
    subColor: raw.디자인정보?.서브컬러 ?? "",
    backgroundStyle: raw.디자인정보?.배경스타일 ?? "",
    moodKeywords,
    fontStyle: raw.디자인정보?.폰트스타일 ?? "",
    layoutDensity: raw.디자인정보?.레이아웃밀도 ?? "",
  };
}
