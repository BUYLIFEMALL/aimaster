import type { AnalysisResult, Suggestion } from "./types";
import { FEATURE_INFO } from "./types";

// 결과를 Markdown / CSV 텍스트로 바꾼다(순수 함수, 클라이언트에서 파일로 저장). 단위 테스트 대상.

const sugMd = (items: Suggestion[]) =>
  items.map((s, i) => `${i + 1}. **${s.title}**\n   - 썸네일 문구: ${s.thumbnailCopy}\n   - 공략: ${s.strategy}`).join("\n");

function src(sources: { title: string; uri: string }[]) {
  return sources.length ? `\n## 참고한 출처\n${sources.map((s) => `- [${s.title}](${s.uri})`).join("\n")}\n` : "";
}

function realMd(r: { monthlyPc?: number; monthlyMobile?: number; monthlyTotal?: number; blogDocTotal?: number; compIdx?: string | null }) {
  const lines: string[] = [];
  if (r.monthlyTotal != null) lines.push(`- 월간 검색수(네이버 검색광고 기준): ${r.monthlyTotal.toLocaleString("ko-KR")}회 (PC ${r.monthlyPc?.toLocaleString("ko-KR") ?? "-"} / 모바일 ${r.monthlyMobile?.toLocaleString("ko-KR") ?? "-"})`);
  if (r.blogDocTotal != null) lines.push(`- 네이버 블로그 문서 수: ${r.blogDocTotal.toLocaleString("ko-KR")}건`);
  if (r.compIdx) lines.push(`- 광고 경쟁도: ${r.compIdx}`);
  return lines.length ? `\n## 실측 지표\n${lines.join("\n")}\n` : "";
}

export function toMarkdown(result: AnalysisResult): string {
  const title = FEATURE_INFO.find((f) => f.id === result.kind)?.title ?? result.kind;
  const head = (kw: string) => `# ${title}${kw ? ` — ${kw}` : ""}\n`;
  switch (result.kind) {
    case "autocomplete":
      return `${head(result.keyword)}\n## 자동완성 키워드(${result.engine === "naver" ? "네이버" : "구글"})\n${result.keywords
        .map((k) => `- ${k.text}${k.monthlyTotal != null ? ` (월 ${k.monthlyTotal.toLocaleString("ko-KR")}회)` : ""}`)
        .join("\n")}\n${result.topics ? `\n## 만든 글 주제\n${sugMd(result.topics.items)}\n` : ""}`;
    case "related":
      return `${head(result.keyword)}\n## 연관 검색어\n${result.relatedSearches.map((r) => `- **${r.keyword}** — ${r.reason}`).join("\n")}\n\n## 사람들이 묻는 질문\n${result.peopleAlsoAsk
        .map((p) => `### ${p.question}\n${p.answer}\n- 콘텐츠 갭: ${p.gap}`)
        .join("\n\n")}\n\n## 콘텐츠 갭 요약\n${result.contentGap}\n${
        result.strategy
          ? `\n## 검색 의도\n${result.strategy.userIntent}\n\n## 기둥 글\n**${result.strategy.pillarPost.title}**\n${result.strategy.pillarPost.outline.map((o) => `- ${o}`).join("\n")}\n\n## 공략 글 제안\n${sugMd(result.strategy.suggestions)}\n`
          : ""
      }${src(result.sources)}`;
    case "blogs":
      return `${head(result.keyword)}${realMd(result.real)}\n## 상위 블로그\n${result.posts.map((p, i) => `${i + 1}. [${p.title}](${p.link}) — ${p.blogger}`).join("\n")}\n\n## 구조 분석\n${result.analysis.structure}\n\n## 공통 특징\n${result.analysis.characteristics}\n\n- 공통 키워드: ${result.analysis.commonKeywords.join(", ")}\n\n## 1위 공략 제안\n${sugMd(result.suggestions)}\n`;
    case "competition": {
      const a = result.analysis;
      return `${head(result.keyword)}\n- 기회 점수: ${result.opportunityScore}/100 (AI 추정)\n- 검색 관심도: ${result.searchInterestIndex}/100 (AI 추정)\n- 경쟁 난이도: ${result.competitionIndex}/100 · ${result.competitionLevel} (AI 추정)\n- 문서 수: ${result.documentCount}\n${realMd(result.real)}\n## ${a.title}\n${a.reason}\n\n### 기회 요인\n${a.opportunity}\n\n### 위협 요인\n${a.threat}\n\n### 소비·이슈 흐름\n${a.consumption}\n\n### 결론\n${a.conclusion}\n${
        result.strategy ? `\n## 확장 키워드\n${result.strategy.expandedKeywords.map((k) => `- ${k}`).join("\n")}\n\n## 공략 글 제안\n${sugMd(result.strategy.blogTopics)}\n` : ""
      }${src(result.sources)}`;
    }
    case "recommend":
      return `${head(result.date)}\n${result.items
        .map((i, n) => `## ${n + 1}. ${i.keyword} (${i.category})\n- 이유: ${i.reason}\n- 제목: ${i.title}\n- 썸네일 문구: ${i.thumbnailCopy}\n- 공략: ${i.strategy}`)
        .join("\n\n")}\n${src(result.sources)}`;
    case "sustainable":
      return `${head(result.keyword)}\n${result.categories
        .map((c) => `## ${c.name}\n${c.description}\n\n${c.topics.map((t, i) => `${i + 1}. **${t.title}**\n   - 핵심 키워드: ${t.keywords.join(", ")}\n   - SEO 전략: ${t.seoStrategy}`).join("\n")}`)
        .join("\n\n")}\n`;
    case "news":
      return `${head(result.keyword)}\n## 최신 뉴스\n${result.items.map((n, i) => `${i + 1}. [${n.title}](${n.link})`).join("\n")}\n\n- 핵심 이슈: ${result.analysis.coreIssue}\n- 독자 관심 포인트: ${result.analysis.userInterestPoint}\n- 블로그 기회: ${result.analysis.opportunity}\n\n## 글 제안\n${sugMd(result.suggestions)}\n`;
    case "trend":
      return `${head(result.keyword)}\n${result.summary}\n\n## 빈출 키워드\n${result.frequent
        .map((f) => `- ${f.word} (${f.count}회${f.trendDelta != null ? `, 최근 검색 추이 ${f.trendDelta >= 0 ? "+" : ""}${f.trendDelta}%` : ""})`)
        .join("\n")}\n\n## 빈출어 기반 글 제안\n${sugMd(result.keywordBased)}\n\n## 흐름 분석 기반 글 제안\n${sugMd(result.analysisBased)}\n`;
    case "prompt":
      return `# ${result.promptTitle} — ${result.keyword}\n\n${result.markdown}\n${src(result.sources)}`;
  }
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  // 스프레드시트 수식 주입을 막기 위해 = + - @ 로 시작하는 값 앞에 작은따옴표를 붙인다.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** 표로 옮길 수 있는 결과를 CSV로. 표가 없는 종류(프롬프트)는 null. */
export function toCsv(result: AnalysisResult): string | null {
  const rows: unknown[][] = [];
  const sug = (items: Suggestion[]) => items.forEach((s) => rows.push([s.title, s.thumbnailCopy, s.strategy]));
  switch (result.kind) {
    case "autocomplete":
      rows.push(["키워드", "월간 검색수"]);
      result.keywords.forEach((k) => rows.push([k.text, k.monthlyTotal ?? ""]));
      if (result.topics) { rows.push([]); rows.push(["제목", "썸네일 문구", "공략 전략"]); sug(result.topics.items); }
      break;
    case "related":
      rows.push(["제목", "썸네일 문구", "공략 전략"]);
      sug(result.strategy?.suggestions ?? []);
      break;
    case "blogs":
      rows.push(["제목", "썸네일 문구", "공략 전략"]);
      sug(result.suggestions);
      break;
    case "competition":
      rows.push(["제목", "썸네일 문구", "공략 전략"]);
      sug(result.strategy?.blogTopics ?? []);
      break;
    case "recommend":
      rows.push(["키워드", "분류", "이유", "제목", "썸네일 문구", "공략"]);
      result.items.forEach((i) => rows.push([i.keyword, i.category, i.reason, i.title, i.thumbnailCopy, i.strategy]));
      break;
    case "sustainable":
      rows.push(["관점", "제목", "핵심 키워드", "SEO 전략"]);
      result.categories.forEach((c) => c.topics.forEach((t) => rows.push([c.name, t.title, t.keywords.join(", "), t.seoStrategy])));
      break;
    case "news":
      rows.push(["제목", "썸네일 문구", "공략 전략"]);
      sug(result.suggestions);
      break;
    case "trend":
      rows.push(["구분", "제목", "썸네일 문구", "공략 전략"]);
      result.keywordBased.forEach((s) => rows.push(["빈출어 기반", s.title, s.thumbnailCopy, s.strategy]));
      result.analysisBased.forEach((s) => rows.push(["흐름 분석 기반", s.title, s.thumbnailCopy, s.strategy]));
      break;
    case "prompt":
      return null;
  }
  return `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`;
}
