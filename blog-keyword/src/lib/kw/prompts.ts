import { todayKst, yearGuard } from "./util";

// 모든 프롬프트에 당해 연도·오늘 날짜를 주입한다(핵심 원칙 8번). 사람이 등장하는 문구가 있으면 한국인 기준(핵심 원칙 3번).
const PERSONA =
  "당신은 한국 네이버 블로그·구글 검색 환경을 깊이 아는 SEO 콘텐츠 전략가입니다. 모든 답변은 자연스러운 한국어로 작성하고, 근거 없는 수치를 지어내지 마세요.";

const JSON_ONLY = "응답은 설명·머리말·코드 펜스 없이 JSON 객체 하나만 출력하세요.";

// ---- responseSchema 도우미(그라운딩을 쓰지 않는 호출 전용) ----
const S = { type: "STRING" };
const arr = (items: unknown) => ({ type: "ARRAY", items });
const obj = (properties: Record<string, unknown>, required?: string[]) => ({ type: "OBJECT", properties, required: required ?? Object.keys(properties) });

const suggestion = obj({ title: S, thumbnailCopy: S, strategy: S });
export const suggestionsSchema = obj({ suggestions: arr(suggestion) });

// ---- ① 자동완성 → 주제 만들기 ----
export function topicsPrompt(mode: "main" | "all", keyword: string, keywords: string[], now?: Date) {
  const t = todayKst(now);
  const list = keywords.slice(0, 20).map((k, i) => `${i + 1}. ${k}`).join("\n");
  const system = `${yearGuard(now)}\n${PERSONA}\n사용자가 준 키워드로 블로그 글 주제 10개를 제안합니다. 각 주제는 제목(클릭하고 싶은 문장, 30자 안팎), 썸네일 문구(12자 이내, 강한 한 줄), 공략 전략(이 글을 1페이지에 올리기 위한 구체적 방법 1~2문장)으로 구성합니다. 제목에 연도가 필요하면 ${t.year}년을 씁니다.\n${JSON_ONLY}`;
  const user =
    mode === "main"
      ? `메인 키워드: ${keyword}\n이 키워드 하나에 집중해 서로 겹치지 않는 주제 10개를 제안하세요.`
      : `메인 키워드: ${keyword}\n아래 자동완성 키워드를 조합해 검색 의도가 서로 다른 주제 10개를 제안하세요(가능하면 여러 키워드를 한 글에 자연스럽게 묶습니다).\n${list}`;
  return { system, user, schema: suggestionsSchema };
}

// ---- ② AI 연관검색어(구글 검색 그라운딩) ----
export function relatedPrompt(keyword: string, now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n구글 검색을 사용해 실제 검색 결과를 조사한 뒤 답하세요. ${JSON_ONLY}\n형식:\n{"relatedSearches":[{"keyword":"연관 검색어","reason":"왜 함께 검색되는지 한 문장"}] (정확히 10개),\n"peopleAlsoAsk":[{"question":"사람들이 묻는 질문","answer":"2~3문장의 정확한 답","gap":"기존 상위 글이 놓친 부분 한 문장"}] (정확히 5개),\n"contentGap":"상위 글 전반이 비어 둔 정보·관점을 3~4문장으로 요약"}`;
  const user = `키워드: ${keyword}\n오늘 날짜: ${t.label}\n이 키워드를 검색하는 사람들의 연관 검색어 10개, 함께 묻는 질문 5개, 콘텐츠 갭을 조사하세요.`;
  return { system, user };
}

export function relatedStrategyPrompt(keyword: string, data: { relatedSearches: { keyword: string }[]; peopleAlsoAsk: { question: string; gap: string }[]; contentGap: string }, now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n조사 결과를 바탕으로 블로그 공략 전략을 만듭니다. userIntent는 검색자의 진짜 의도를 2~3문장으로, pillarPost는 이 키워드의 대표 기둥 글(제목 1개 + 목차 5~7개), suggestions는 콘텐츠 갭을 메우는 글 10개(제목·썸네일 문구 12자 이내·공략 전략)입니다. 제목에 연도가 필요하면 ${t.year}년을 씁니다.\n${JSON_ONLY}`;
  const user = `키워드: ${keyword}\n연관 검색어: ${data.relatedSearches.map((r) => r.keyword).join(", ")}\n사람들이 묻는 질문과 빈틈:\n${data.peopleAlsoAsk.map((p) => `- ${p.question} → ${p.gap}`).join("\n")}\n콘텐츠 갭: ${data.contentGap}`;
  const schema = obj({
    userIntent: S,
    pillarPost: obj({ title: S, outline: arr(S) }),
    suggestions: arr(suggestion),
  });
  return { system, user, schema };
}

// ---- ③ 상위 블로그 분석 ----
export function blogsStrategyPrompt(keyword: string, posts: { title: string; description: string }[], now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n네이버 상위 노출 블로그 글 10개의 제목·요약을 분석합니다. analysis.structure는 상위 글들이 쓰는 제목·구성 패턴, analysis.characteristics는 공통 특징(감성·정보 비중, 숫자·연도 사용 등), analysis.commonKeywords는 공통으로 쓰인 핵심 단어 8~10개입니다. suggestions는 1위를 노리는 글 10개(제목·썸네일 문구 12자 이내·공략 전략)입니다. 제목에 연도가 필요하면 ${t.year}년을 씁니다.\n${JSON_ONLY}`;
  const user = `키워드: ${keyword}\n상위 글:\n${posts.map((p, i) => `${i + 1}. ${p.title}\n   ${p.description.slice(0, 120)}`).join("\n")}`;
  const schema = obj({
    analysis: obj({ structure: S, characteristics: S, commonKeywords: arr(S) }),
    suggestions: arr(suggestion),
  });
  return { system, user, schema };
}

// ---- ④ 키워드 경쟁력(그라운딩) ----
export function competitionPrompt(keyword: string, real: { blogDocTotal?: number; monthlyTotal?: number } = {}, now?: Date) {
  const t = todayKst(now);
  const facts: string[] = [];
  if (real.blogDocTotal != null) facts.push(`네이버 블로그 검색 결과 문서 수(실측): ${real.blogDocTotal.toLocaleString("ko-KR")}건`);
  if (real.monthlyTotal != null) facts.push(`네이버 월간 검색수(실측): ${real.monthlyTotal.toLocaleString("ko-KR")}회`);
  const system = `${yearGuard(now)}\n${PERSONA}\n구글 검색을 사용해 이 키워드의 검색 환경(상위 콘텐츠의 질·다양성, 최근 이슈, 광고·쇼핑 비중)을 조사하고 신규 블로거 관점에서 경쟁력을 평가합니다. 점수는 모두 0~100 정수이며 AI의 추정치입니다. ${JSON_ONLY}\n형식:\n{"opportunityScore":0-100(높을수록 도전할 가치 큼),"searchInterestIndex":0-100(검색 관심도),"competitionIndex":0-100(경쟁 난이도),"competitionLevel":"낮음|중간|높음","documentCount":"문서 수 추정(예: 약 3만 건)",\n"analysis":{"title":"한 줄 진단","reason":"점수의 근거","opportunity":"기회 요인","threat":"위협 요인","consumption":"소비자 관심·이슈 흐름","conclusion":"최종 결론과 권장 행동"},\n"strategy":{"expandedKeywords":["확장 키워드 3~5개"],"blogTopics":[{"title":"","thumbnailCopy":"12자 이내","strategy":""}] (5개)}}\nopportunityScore가 80 이상이면 strategy는 null로 두세요.${facts.length ? `\n아래 실측 값은 사실이므로 그대로 근거로 쓰고 추정으로 바꾸지 마세요:\n${facts.join("\n")}` : ""}`;
  const user = `키워드: ${keyword}\n오늘 날짜: ${t.label}`;
  return { system, user };
}

// ---- ⑤ 오늘의 전략 키워드(그라운딩) ----
export function recommendPrompt(now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n구글 검색으로 오늘(${t.label}) 기준 최신 소식을 조사해 블로그 글로 쓰기 좋은 전략 키워드 10개를 고릅니다. 정책·제도(지원금, 신청 기간, 제도 변경 등) 5개와 일반 이슈(생활·트렌드·시즌) 5개로 구성하고, 이미 지난 일정이나 ${t.year}년이 아닌 정보는 제외합니다. ${JSON_ONLY}\n형식:\n{"items":[{"keyword":"","category":"정책/제도 또는 이슈","reason":"지금 이 키워드인 이유(날짜·근거 포함)","title":"블로그 제목","thumbnailCopy":"12자 이내","strategy":"공략법"}] (정확히 10개)}`;
  const user = `오늘 날짜: ${t.label}\n정책·제도 5개와 이슈 5개 키워드를 제안하세요.`;
  return { system, user };
}

// ---- ⑥ 다각도 블로그 주제 발굴 ----
export function sustainablePrompt(keyword: string, now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n하나의 이슈성 키워드를 오래 읽히는(롱런) 콘텐츠로 넓히는 방법론을 적용합니다. 서로 다른 4개 관점(예: 문제 해결, 비교·선택 가이드, 사례·후기, 시즌·시기별 정보)을 정하고, 관점마다 글 제목 10개를 만드세요. 각 제목에는 함께 공략할 핵심 키워드 5개와 SEO 글쓰기 전략(첫 문단·소제목·내부 링크 방향 등 1~2문장)을 붙입니다. 제목은 중복 없이 구체적이어야 하며 연도가 필요하면 ${t.year}년을 씁니다.\n${JSON_ONLY}`;
  const user = `메인 키워드: ${keyword}\n4개 관점 × 10개 글감, 총 40개를 설계하세요.`;
  const schema = obj({
    categories: arr(obj({
      name: S,
      description: S,
      topics: arr(obj({ title: S, keywords: arr(S), seoStrategy: S })),
    })),
  });
  return { system, user, schema };
}

// ---- ⑦ 뉴스 기반 전략 ----
export function newsStrategyPrompt(keyword: string, items: { title: string; description: string; pubDate: string }[], now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n최신 뉴스 10건을 읽고 블로그 글 기회를 찾습니다. analysis.coreIssue는 지금 핵심 이슈, userInterestPoint는 독자가 가장 궁금해할 지점, opportunity는 뉴스 기사가 채우지 못한 블로그 글의 기회입니다. suggestions는 뉴스를 활용한 글 10개(제목·썸네일 문구 12자 이내·공략 전략)입니다. 제목에 연도가 필요하면 ${t.year}년을 씁니다.\n${JSON_ONLY}`;
  const user = `키워드: ${keyword}\n뉴스:\n${items.map((n, i) => `${i + 1}. [${n.pubDate}] ${n.title}\n   ${n.description.slice(0, 140)}`).join("\n")}`;
  const schema = obj({
    analysis: obj({ coreIssue: S, userInterestPoint: S, opportunity: S }),
    suggestions: arr(suggestion),
  });
  return { system, user, schema };
}

// ---- ⑧ 카테고리 트렌드 ----
export function trendPrompt(
  category: string,
  titles: string[],
  frequent: { word: string; count: number; trendDelta?: number | null }[],
  now?: Date,
) {
  const t = todayKst(now);
  const freq = frequent.map((f) => `${f.word}(${f.count}회${f.trendDelta != null ? `, 최근 검색 추이 ${f.trendDelta >= 0 ? "+" : ""}${f.trendDelta}%` : ""})`).join(", ");
  const system = `${yearGuard(now)}\n${PERSONA}\n'${category}' 분야의 최신 블로그 제목과 빈출어, 실제 검색 추이를 보고 지금 뜨는 키워드를 읽어냅니다. summary는 지금 이 분야에서 무슨 일이 벌어지는지 3~4문장, keywordBased는 빈출어를 활용한 글 5개, analysisBased는 흐름을 분석해 새로 제안하는 글 5개입니다(제목·썸네일 문구 12자 이내·공략 전략). 제목에 연도가 필요하면 ${t.year}년을 씁니다.\n${JSON_ONLY}`;
  const user = `분야: ${category}\n빈출어: ${freq || "(충분한 빈출어 없음)"}\n최신 블로그 제목 ${titles.length}개:\n${titles.slice(0, 40).map((x, i) => `${i + 1}. ${x}`).join("\n")}`;
  const schema = obj({ summary: S, keywordBased: arr(suggestion), analysisBased: arr(suggestion) });
  return { system, user, schema };
}

// ---- 프롬프트 라이브러리 실행(그라운딩, 마크다운 보고서) ----
export function libraryRunPrompt(promptText: string, keyword: string, now?: Date) {
  const t = todayKst(now);
  const system = `${yearGuard(now)}\n${PERSONA}\n구글 검색으로 최신 정보를 확인하면서 사용자가 준 지시를 수행하고, 결과를 마크다운 보고서(제목·소제목·표·목록)로 정리합니다. 표를 쓸 때는 마크다운 표 문법을 지키고, 확인하지 못한 수치는 '추정'이라고 밝히세요. 인용 번호([1] 등)는 쓰지 않습니다.`;
  const user = `오늘 날짜: ${t.label}\n핵심 키워드: ${keyword}\n\n${promptText}`;
  return { system, user };
}

// ---- 연결 테스트용 아주 짧은 호출 ----
export const PING = { system: "한 단어로만 답하세요.", user: "OK 라고만 답하세요." };

