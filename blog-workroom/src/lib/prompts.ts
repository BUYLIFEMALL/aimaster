import { todayKst } from "@/lib/util";
import type { BlogData, BriefSource, ResearchData, StyleProfile, Section } from "@/lib/types";

// AI 지시문. 원본 프로그램(도톨이 AI)의 지시문·작성 지식은 쓰지 않았다(권리 없음 — 기능만 참고).
// 작성 원칙은 네이버 서치어드바이저의 공개 가이드(콘텐츠 기본·어뷰징 안내)를 우리 말로 요약해 새로 만든 것이다.

/** 기준 시점(핵심 원칙 8): 모든 지시문 맨 앞에 붙인다 */
export function nowRule(now = new Date()): string {
  const t = todayKst(now);
  return `[기준 시점: 한국 시간으로 지금은 ${t.year}년 ${t.month}월(${t.label})입니다. 모든 연도·시기·정책·트렌드 표현은 ${t.year}년 ${t.month}월 기준으로 쓰고, 과거 연도(2023년, 2024년 등)를 현재인 것처럼 쓰지 마세요.]`;
}

export const WRITING_PRINCIPLES = `[작성 원칙]
1. 독자가 검색한 이유(궁금한 점)를 첫 부분에서 바로 풀어 준다. 결론·핵심 정보를 뒤로 미루지 않는다.
2. 직접 확인한 정보와 자료에서 가져온 정보를 구분한다. 자료에 없는 수치·날짜·가격·효과는 만들지 않는다.
3. 실제로 겪지 않은 경험(구매·방문·사용)을 겪은 것처럼 쓰지 않는다. 경험 표현은 작성자가 직접 확인해 고칠 수 있게 [경험 확인 필요] 표시를 붙인다.
4. 같은 키워드를 억지로 반복하지 않는다. 제목과 첫 문단에 자연스럽게 한 번씩 넣고 나머지는 자연스러운 말로 쓴다.
5. 다른 글의 문장을 그대로 옮기지 않는다. 내용은 내 말로 다시 쓰고, 필요한 곳에는 출처를 밝힌다.
6. 과장·단정 표현(무조건, 100%, 최고, 완치 등)과 민감한 표현(의료·법률·투자 효과 단정, 비하)을 쓰지 않는다.
7. 짧은 문단, 소제목, 목록으로 읽기 쉽게 만든다. 모바일 화면에서 한 문단은 3~4줄 이내로 쓴다.
8. 광고·협찬이 있으면 숨기지 않는다. 검색 순위·수익을 약속하는 표현을 쓰지 않는다.`;

const KOREAN_PEOPLE = "사람이 등장하면 기본적으로 한국인(동아시아인) 외모로 묘사한다. 해외 특정 인물·해외 장소가 꼭 필요한 내용일 때만 그 맥락에 맞춘다.";

export const SYS_JSON = (role: string) => `${nowRule()}\n당신은 ${role}입니다. 반드시 한국어로, 요청한 JSON 객체 하나만 출력하세요. 문장 안에서 인용할 때는 큰따옴표 대신 「」를 쓰세요.`;

// ---- 1. 내 블로그 스타일 ----
export function stylePrompt(b: Pick<BlogData, "name" | "posts" | "samples">): string {
  const posts = b.posts.map((p, i) => `#${i + 1} 제목: ${p.title}\n분류: ${p.category}\n본문: ${p.text.slice(0, 1800)}`).join("\n\n");
  const samples = b.samples.map((s, i) => `표본 ${i + 1}: ${s.slice(0, 2000)}`).join("\n\n");
  return `아래는 블로그 「${b.name}」의 최근 글과 작성자가 붙여 넣은 글 표본입니다. 이 블로그의 글쓰기 특징을 분석하세요. 추측은 근거가 보이는 것만 쓰고, 글에 없는 사실을 지어내지 마세요.

${posts}
${samples ? `\n${samples}` : ""}

다음 JSON으로 답하세요:
{"summary":"블로그 성격 2~3문장","tone":"어조·말투(존댓말/반말, 친근함 정도 등)","sentence":"문장 길이·리듬·문단 습관","structure":"글 구성 습관(도입·소제목·마무리)","reader":"주로 읽는 독자와 그들의 관심","expressions":["자주 쓰는 표현·말버릇 최대 8개"],"avoid":["이 블로그에 어울리지 않는 표현 최대 5개"],"topics":["주로 다루는 주제 최대 8개"],"categories":["블로그 대표 카테고리 최대 3개"],"subtopics":["세부 주제 최대 5개"],"strengths":["강점 최대 4개"],"cautions":["개선하면 좋을 점 최대 4개"]}`;
}

export function styleBrief(s: StyleProfile | null): string {
  if (!s) return "(내 블로그 스타일 분석 없음 — 일반적인 친근한 존댓말 블로그 문체로 작성)";
  return `[내 블로그 스타일]\n성격: ${s.summary}\n어조: ${s.tone}\n문장: ${s.sentence}\n구성: ${s.structure}\n독자: ${s.reader}\n자주 쓰는 표현: ${s.expressions.join(", ")}\n피할 표현: ${s.avoid.join(", ")}`;
}

// ---- 2. 키워드 탐색 ----
export function seedPrompt(style: StyleProfile | null, categories: string[], subtopics: string[], exclude: string[]): string {
  return `${styleBrief(style)}
블로그 카테고리: ${categories.join(", ") || "(없음)"}
세부 주제: ${subtopics.join(", ") || "(없음)"}
이미 보관한 키워드(제외): ${exclude.slice(0, 80).join(", ") || "(없음)"}

이 블로그 작성자가 다음 글로 쓰기 좋은 네이버 검색어 후보를 찾으세요. 사람들이 실제로 검색창에 입력할 만한 2~4단어 검색어로, 지금 시기(${todayKst().year}년 ${todayKst().month}월)에 맞는 것을 우선합니다. 너무 넓은 한 단어 검색어는 피하세요.
JSON: {"seeds":[{"keyword":"검색어(띄어쓰기 포함)","why":"이 블로그에 맞는 이유 한 문장"}]} — seeds는 8~12개.`;
}

// ---- 3. 트렌드 관측 ----
export function trendPrompt(style: StyleProfile | null, topic: string, sources: BriefSource[]): string {
  const list = sources.map((s, i) => `[${i + 1}] (${s.kind}) ${s.title} — ${s.summary}`).join("\n");
  return `${styleBrief(style)}
관측 주제: ${topic}
아래는 최근 뉴스·웹 자료입니다.
${list}

1) 자료 전체를 이 블로그 작성자 관점에서 5~8문장으로 요약하세요(자료에 있는 내용만).
2) 자료에 실제로 나온 새 용어·화제 중, 이 블로그가 다룰 만하고 사람들이 검색할 만한 검색어를 최대 10개 고르세요. 자료에 없는 용어는 넣지 마세요.
JSON: {"summary":"요약","terms":[{"term":"검색어","why":"어느 자료에서 나왔고 왜 맞는지"}]}`;
}

// ---- 4. 블로그 벤치마킹 ----
export function benchPrompt(style: StyleProfile | null, name: string, posts: { title: string; text: string }[]): string {
  const list = posts.map((p, i) => `#${i + 1} ${p.title}${p.text ? `\n${p.text.slice(0, 1500)}` : ""}`).join("\n\n");
  return `${styleBrief(style)}
참고할 블로그: 「${name}」의 최근 글
${list}

이 블로그가 어떤 주제·제목 방식으로 글을 쓰는지 분석하고, 내 블로그가 참고할 만한 검색어를 뽑으세요. 글에 실제로 나온 주제에서만 뽑으세요(문장을 베끼라는 뜻이 아님).
JSON: {"pattern":"제목·구성 패턴 3~4문장","strengths":["배울 점 최대 4개"],"keywords":[{"keyword":"검색어","why":"이유"}]} — keywords 최대 10개.`;
}

// ---- 5. 글 작성 준비 ----
export function researchPrompt(r: Pick<ResearchData, "keyword" | "query" | "sources" | "news">, style: StyleProfile | null): string {
  const src = r.sources.map((s, i) => `[자료 ${i + 1}] ${s.title}\n${s.text.slice(0, 3500)}`).join("\n\n");
  const news = r.news.map((n, i) => `[뉴스 ${i + 1}] ${n.title} — ${n.summary}`).join("\n");
  return `${styleBrief(style)}
검색어: ${r.query} (보관 키워드: ${r.keyword})
아래는 이 검색어의 상위 블로그 글과 관련 뉴스입니다.
${src}
${news ? `\n${news}` : ""}

글을 쓰기 전에 필요한 사전 지식을 정리하세요.
- points: 독자에게 필요한 사실·정보 12~20개. 각 항목은 내 말로 다시 쓴 한 문장이고, 근거가 된 자료 번호(source, 자료 n이면 n, 뉴스면 100+n)와 그 자료 속 짧은 근거 구절(quote, 30자 이내, 원문 그대로)을 붙입니다. 근거 구절을 찾지 못한 정보는 넣지 마세요.
- angle: 상위 글들과 다르게 쓸 수 있는 내 글만의 방향 2~3문장.
- gaps: 상위 글들이 잘 다루지 않은 독자 궁금증 최대 5개.
JSON: {"points":[{"text":"","source":1,"quote":""}],"angle":"","gaps":[""]}`;
}

// ---- 6. 글 작성 ----
export function outlinePrompt(r: ResearchData, style: StyleProfile | null, o: { type: string; length: string; experience: string; request: string }): string {
  const pts = r.points.filter((p) => p.kept).map((p, i) => `${i + 1}. ${p.text}`).join("\n");
  return `${styleBrief(style)}
${WRITING_PRINCIPLES}

검색어: ${r.query}
글 유형: ${o.type} / 분량: ${o.length} / 경험 표현: ${o.experience}
작성자 요청: ${o.request || "(없음)"}
내 글의 방향: ${r.angle}
독자 궁금증: ${r.gaps.join(", ")}
승인된 사전 지식:
${pts}

이 글의 제목 후보와 소제목 구성을 만드세요. 소제목은 ${o.length === "짧게(1500자 내외)" ? "3~4" : o.length === "길게(4000자 이상)" ? "6~8" : "4~6"}개, 각 소제목에 담을 내용(goal)을 한 문장으로 적으세요. 도입부는 첫 항목(heading은 빈 문자열)으로 넣으세요.
JSON: {"titles":["제목 후보 3개"],"sections":[{"heading":"","goal":""}]}`;
}

export function sectionPrompt(r: ResearchData, style: StyleProfile | null, o: { type: string; length: string; experience: string; request: string }, title: string, sections: Section[], index: number): string {
  const pts = r.points.filter((p) => p.kept).map((p, i) => `${i + 1}. ${p.text}`).join("\n");
  const outline = sections.map((s, i) => `${i === index ? "▶ " : ""}${i + 1}. ${s.heading || "(도입)"} — ${s.goal}`).join("\n");
  const before = sections.slice(0, index).map((s) => `${s.heading ? `■ ${s.heading}\n` : ""}${s.body}`).join("\n\n").slice(-3000);
  const per = o.length === "짧게(1500자 내외)" ? "250~400자" : o.length === "길게(4000자 이상)" ? "600~900자" : "400~600자";
  const exp = o.experience === "쓰지 않음" ? "경험담 표현을 쓰지 말고 정보 전달형으로 쓰세요." : "경험 표현이 필요하면 쓰되, 문장 끝에 [경험 확인 필요]를 붙여 작성자가 실제 경험에 맞게 고치게 하세요.";
  return `${styleBrief(style)}
${WRITING_PRINCIPLES}

글 제목: ${title}
검색어: ${r.query} / 글 유형: ${o.type}
작성자 요청: ${o.request || "(없음)"}
전체 구성(▶ 표시가 이번에 쓸 부분):
${outline}
승인된 사전 지식(이 안의 정보만 사실로 사용):
${pts}
지금까지 쓴 본문(이어지게 쓰되 반복하지 말 것):
${before || "(처음)"}

▶ 표시 부분의 본문을 내 블로그 스타일로 ${per} 분량으로 쓰세요. ${exp} 소제목 문구는 본문에 다시 쓰지 마세요. 마크다운 기호(#, **)는 쓰지 말고 문단은 빈 줄로 나누세요.
JSON: {"body":"본문"}`;
}

// ---- 7. 최종 검수 ----
export function reviewPrompt(title: string, text: string, style: StyleProfile | null, pointTexts: string[]): string {
  return `${styleBrief(style)}
${WRITING_PRINCIPLES}

승인된 사전 지식(사실 확인 기준):
${pointTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}

검수할 글 — 제목: ${title}
${text}

위 글을 6개 영역에서 점검하세요: 「내 블로그 스타일」「작성 원칙」「사실·출처」「경험 표현」「자료 유사 표현」「민감·과장 표현」.
각 문제는 글 속 문장을 그대로 짧게 인용(quote, 원문 그대로 10~60자)하고, 이유와 고친 문장 제안을 적으세요. 반드시 고쳐야 하는 것(사실과 다름, 지어낸 경험·수치, 과장·민감 표현)은 level을 「필수」, 나머지는 「권장」으로 하세요. 문제가 없으면 issues를 빈 배열로 두세요.
JSON: {"summary":"전체 평가 2~3문장","issues":[{"area":"영역","level":"필수","quote":"","reason":"","suggestion":""}]}`;
}

// ---- 8. 이미지 제작 ----
export function imagePlanPrompt(title: string, paragraphs: string[], count: number, common: string): string {
  return `블로그 글 「${title}」의 이미지를 기획하세요. 대표 이미지 1장과 본문 이미지 ${count}장을 만듭니다.
문단 목록:
${paragraphs.map((p, i) => `[${i + 1}] ${p.slice(0, 500)}`).join("\n")}
공통 요청: ${common || "(없음)"}

각 이미지에 담당 문단 번호(paragraph), 담을 내용(content, 한 문장), 표현 방식(style: 「스마트폰 생활 사진」「깔끔한 정보 카드」「일러스트」「제품·사물 클로즈업」「풍경·장소」 중 하나)을 정하세요. 대표 이미지는 글 전체를 대표하는 장면으로 하고 paragraph는 0으로 하세요.
JSON: {"nodes":[{"role":"대표","paragraph":0,"content":"","style":""},{"role":"본문","paragraph":1,"content":"","style":""}]}`;
}

export function imagePrompt(o: { title: string; paragraph: string; content: string; style: string; request: string; common: string; hasRefs: boolean }): string {
  return `${nowRule()}
블로그 글 「${o.title}」에 들어갈 이미지 1장을 만드세요.
담을 내용: ${o.content}
관련 문단: ${o.paragraph.slice(0, 700)}
표현 방식: ${o.style}
${o.common ? `공통 요청: ${o.common}\n` : ""}${o.request ? `이 이미지 요청(공통 요청과 다르면 이것을 우선): ${o.request}\n` : ""}${o.hasRefs ? "함께 보낸 참고 이미지의 분위기·색감·대상을 참고하되 그대로 복제하지 마세요.\n" : ""}${KOREAN_PEOPLE}
이미지 안에 글자를 넣지 마세요(정보 카드 방식이면 짧은 한국어 제목 한 줄만 허용). 워터마크·로고·실존 브랜드 상표를 넣지 마세요.`;
}
