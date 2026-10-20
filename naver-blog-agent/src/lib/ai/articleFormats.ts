// 글 구성 방식. standard는 기존 정보형 구성이고, homefeed는 네이버 홈판(추천 피드) 노출을 노린 이야기형 구성이다.
export const ARTICLE_FORMATS = [
  { value: "standard", label: "기본 정보형", description: "검색에 맞춘 소제목 목차 구성" },
  { value: "homefeed", label: "홈판형 이슈글", description: "질문형 도입·소제목 4개·클릭형 제목" },
] as const;

export type ArticleFormat = (typeof ARTICLE_FORMATS)[number]["value"];

export function isArticleFormat(value: unknown): value is ArticleFormat {
  return ARTICLE_FORMATS.some((format) => format.value === value);
}

/** 기획 단계에 붙이는 홈판형 규칙. standard면 빈 문자열. */
export function buildFormatResearchRule(format: ArticleFormat): string {
  if (format !== "homefeed") return "";
  return `
[홈판형 이슈글 기획 규칙 — 위 소제목 개수 안내보다 우선]
- 소제목은 정확히 4개로 기획한다. 각 소제목은 "그래서 어떻게 됐는지" 궁금해지는 이야기형 문장으로 쓴다(딱딱한 보고서형 명사 나열 금지).
- 최종 제목은 공백 포함 20~40자. 사람·사건 같은 핵심 키워드를 제목 앞쪽에 두고, 결과·반전·이유 중 하나를 담아 클릭하고 싶게 쓴다.
  예시 틀: "[인물], [행동] 뒤 [결과]" / "[상황], 알고 보니 [반전]" / "[이슈], [화제가 된 이유]"
- 제목 후보를 속으로 5개 만든 뒤 가장 좋은 1개만 finalTitle로 답한다.
- 제공된 자료에 있는 사실만 쓴다. 소문·추측·감정 상태·앞으로의 결과를 지어내지 않는다.`;
}

/** 작성 단계에 붙이는 홈판형 규칙. standard면 빈 문자열. */
export function buildFormatWriterRule(format: ArticleFormat): string {
  if (format !== "homefeed") return "";
  return `
[홈판형 이슈글 작성 규칙]
- 첫 문단은 독자에게 던지는 질문으로 시작해 바로 궁금증을 만든다.
- 기사 요약문처럼 쓰지 말고, 블로그 글답게 리듬 있는 짧은 문장으로 모바일에서 읽기 쉽게 쓴다.
- 4개 소제목의 분량을 비슷하게 맞춘다.
- 제공된 사실만 쓰고, 기자 말투·보도자료 말투를 피한다. 출처 기사 문장을 그대로 길게 옮기지 않는다.`;
}
