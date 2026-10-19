// 챗봇 순수 로직(자동 검사 대상) — 문서 조각 나누기, 웹 검색 판단 해석, 답변 지시문, 출처, 채팅방 제목

export const CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 120;
export const MAX_CHUNKS_PER_DOC = 400;
export const MIN_DOC_SIMILARITY = 0.3;

/** 글을 문단 경계를 살려 약 800자씩, 앞 조각과 120자 겹치게 나눈다(빈 조각 제외, 문서당 최대 400개) */
export function chunkText(raw: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < MAX_CHUNKS_PER_DOC) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf("\n"), window.lastIndexOf(". "), window.lastIndexOf("다. "));
      if (cut > size * 0.5) end = start + cut + 1;
    }
    const piece = text.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export interface RouteDecision {
  web: boolean;
  query: string;
}

/** 라우터 모델 답(JSON)을 해석한다. 형식이 깨지면 웹 검색 안 함 */
export function parseRouteDecision(raw: string, fallbackQuery: string): RouteDecision {
  const m = /\{[\s\S]*\}/.exec(raw);
  if (!m) return { web: false, query: fallbackQuery };
  try {
    const j = JSON.parse(m[0]) as { web?: unknown; query?: unknown };
    const query = typeof j.query === "string" && j.query.trim() ? j.query.trim().slice(0, 200) : fallbackQuery;
    return { web: j.web === true, query };
  } catch {
    return { web: false, query: fallbackQuery };
  }
}

/** 웹 검색이 필요한지 묻는 라우터 지시문 */
export function buildRouterPrompt(question: string, year: number): string {
  return [
    `오늘 기준 연도는 ${year}년입니다. 아래 질문에 답하려면 최신 정보(뉴스·가격·일정·통계·최근 출시·현재 상황 등 학습 자료에 없을 수 있는 정보)를 웹에서 찾아야 하는지 판단하세요.`,
    `일반 지식·설명·글쓰기·코딩·번역처럼 웹 검색이 필요 없으면 web=false.`,
    `반드시 JSON 한 줄만 답하세요: {"web": true 또는 false, "query": "검색어(한국어 또는 영어, 20단어 이내)"}`,
    `질문: ${question}`,
  ].join("\n");
}

export interface DocHit {
  document_name: string;
  content: string;
  similarity: number;
}

export interface Source {
  type: "doc" | "web";
  title: string;
  url?: string;
}

/** 답변 시스템 지시문 — 당해 연도 기준, 자료 우선, 모르면 모른다고 */
export function buildSystemPrompt(year: number, docs: DocHit[], web: { title: string; url: string; content: string }[]): string {
  const lines = [
    `당신은 「AI 문서 챗봇」입니다. 한국어로 친절하고 정확하게, 핵심부터 답합니다.`,
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기·정보는 ${year}년(당해 연도)을 기준으로 하세요. 과거 연도로 퇴행하지 마세요.]`,
  ];
  if (docs.length) {
    lines.push(`\n[사용자가 올린 문서에서 찾은 내용] — 질문과 관련 있으면 이 내용을 우선 근거로 쓰고, 문서에 없는 내용을 문서에 있는 것처럼 말하지 마세요.`);
    docs.forEach((d, i) => lines.push(`(문서${i + 1}: ${d.document_name})\n${d.content}`));
  }
  if (web.length) {
    lines.push(`\n[웹 검색 결과] — 최신 정보는 이 결과를 근거로 답하고, 결과끼리 다르면 그 사실을 알려 주세요.`);
    web.forEach((w, i) => lines.push(`(웹${i + 1}: ${w.title} — ${w.url})\n${w.content}`));
  }
  if (docs.length || web.length) lines.push(`\n근거 자료로 답할 수 없는 부분은 추측하지 말고 "자료에서 찾지 못했습니다"라고 말하세요. 출처 목록은 화면이 따로 보여 주므로 답변 끝에 출처를 다시 나열하지 마세요.`);
  return lines.join("\n");
}

/** 화면에 보여 줄 참고 출처(문서 이름은 중복 제거, 웹은 주소 중복 제거) */
export function buildSources(docs: DocHit[], web: { title: string; url: string }[]): Source[] {
  const out: Source[] = [];
  const seenDocs = new Set<string>();
  for (const d of docs) {
    if (seenDocs.has(d.document_name)) continue;
    seenDocs.add(d.document_name);
    out.push({ type: "doc", title: d.document_name });
  }
  const seenUrls = new Set<string>();
  for (const w of web) {
    if (seenUrls.has(w.url)) continue;
    seenUrls.add(w.url);
    out.push({ type: "web", title: w.title, url: w.url });
  }
  return out;
}

/** 첫 질문으로 채팅방 제목을 만든다(한 줄, 30자) */
export function roomTitleFrom(question: string): string {
  const one = question.replace(/\s+/g, " ").trim();
  return one.length > 30 ? `${one.slice(0, 30)}…` : one || "새 대화";
}

/** 올릴 수 있는 문서 형식 판단 — text: 바로 읽기, parse: Upstage 문서 읽기 */
export function fileKind(name: string): "text" | "parse" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["txt", "md", "markdown", "csv"].includes(ext)) return "text";
  if (["pdf", "docx", "pptx", "xlsx", "hwp", "hwpx", "png", "jpg", "jpeg"].includes(ext)) return "parse";
  return null;
}

export interface WebResult {
  title: string;
  url: string;
  content: string;
}

/** MCP 도구가 돌려준 글(「Title: … URL: … Content: …」 묶음)에서 결과를 뽑는다 */
export function parseMcpSearchText(text: string): WebResult[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const j = JSON.parse(trimmed) as { results?: WebResult[] } | WebResult[];
      const arr = Array.isArray(j) ? j : j.results ?? [];
      return arr.filter((r) => r && typeof r.url === "string").map((r) => ({ title: String(r.title ?? r.url), url: r.url, content: String(r.content ?? "") }));
    } catch {
      /* 글 형식으로 계속 */
    }
  }
  const out: WebResult[] = [];
  const blocks = text.split(/\n(?=Title:)/);
  for (const b of blocks) {
    const url = /URL:\s*(\S+)/.exec(b)?.[1];
    if (!url || !/^https?:\/\//.test(url)) continue;
    const title = /Title:\s*(.+)/.exec(b)?.[1]?.trim() ?? url;
    const content = /Content:\s*([\s\S]*)/.exec(b)?.[1]?.trim() ?? "";
    out.push({ title, url, content: content.slice(0, 1500) });
  }
  return out;
}

