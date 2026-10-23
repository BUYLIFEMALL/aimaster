// 챗봇 순수 로직(자동 검사 대상) — 문서 조각 나누기, 웹 검색 판단 해석, 답변 지시문, 출처, 채팅방 제목

export const CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 120;
// 2026-10-19 L14: 400 → 1000(약 80만 자). 회원 전체 조각은 MAX_CHUNKS_PER_USER로 묶어 공용 DB 용량을 지킨다
export const MAX_CHUNKS_PER_DOC = 1000;
export const MAX_CHUNKS_PER_USER = 5000;
// 2026-10-19 실검수: 0.3이면 관련 없는 뉴스 질문에도 문서가 출처로 붙어 0.4로 올림(L10)
export const MIN_DOC_SIMILARITY = 0.4;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 한국 시간 기준 오늘 날짜 — 예: "2026-10-19(월)" */
export function todayKst(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const ymd = kst.toISOString().slice(0, 10);
  return `${ymd}(${WEEKDAYS[kst.getUTCDay()]})`;
}

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

export type TimeRange = "day" | "week" | "month" | "year";

export interface RouteDecision {
  web: boolean;
  query: string;
  topic: "general" | "news";
  timeRange: TimeRange | null;
}

const TIME_RANGES: TimeRange[] = ["day", "week", "month", "year"];

/** 라우터 모델 답(JSON)을 해석한다. 형식이 깨지면 웹 검색 안 함 */
export function parseRouteDecision(raw: string, fallbackQuery: string): RouteDecision {
  const off: RouteDecision = { web: false, query: fallbackQuery, topic: "general", timeRange: null };
  const m = /\{[\s\S]*\}/.exec(raw);
  if (!m) return off;
  try {
    const j = JSON.parse(m[0]) as { web?: unknown; query?: unknown; topic?: unknown; time_range?: unknown };
    const query = typeof j.query === "string" && j.query.trim() ? j.query.trim().slice(0, 200) : fallbackQuery;
    const timeRange = TIME_RANGES.includes(j.time_range as TimeRange) ? (j.time_range as TimeRange) : null;
    return { web: j.web === true, query, topic: j.topic === "news" ? "news" : "general", timeRange };
  } catch {
    return off;
  }
}

/** 웹 검색이 필요한지 묻는 라우터 지시문. 문서에서 찾은 내용(docs)을 함께 보여 주어 문서로 답할 수 있으면 검색하지 않게 한다(L9) */
export function buildRouterPrompt(question: string, today: string, docs: DocHit[] = []): string {
  const lines = [
    `오늘은 ${today}입니다(한국 시간). 아래 질문에 답하려면 최신 정보(뉴스·가격·일정·통계·최근 출시·현재 상황 등 학습 자료에 없을 수 있는 정보)를 웹에서 찾아야 하는지 판단하세요.`,
    `일반 지식·설명·글쓰기·코딩·번역처럼 웹 검색이 필요 없으면 web=false.`,
  ];
  if (docs.length) {
    lines.push(
      `사용자가 올린 문서에서 아래 내용을 찾았습니다. 이 내용만으로 질문에 답할 수 있고 질문이 최신 소식을 묻는 것이 아니면 web=false로 하세요.`,
      ...docs.slice(0, 3).map((d, i) => `(문서${i + 1}: ${d.document_name}) ${d.content.replace(/\s+/g, " ").slice(0, 300)}`)
    );
  }
  lines.push(
    `web=true이면 topic과 time_range도 정하세요. 뉴스·소식·발표·동향을 묻는 질문은 topic="news", 그 밖에는 "general".`,
    `"오늘·어제"는 "day", "이번 주·최근 며칠"은 "week", "이번 달·최근"은 "month", "올해"는 "year", 기간과 상관없으면 null.`,
    `반드시 JSON 한 줄만 답하세요: {"web": true 또는 false, "query": "검색어(한국어 또는 영어, 20단어 이내)", "topic": "news" 또는 "general", "time_range": "day"|"week"|"month"|"year"|null}`,
    `질문: ${question}`
  );
  return lines.join("\n");
}

export interface DocHit {
  document_id?: string;
  document_name: string;
  content: string;
  similarity: number;
}

/**
 * 검색 결과에서 답변 근거로 쓸 조각을 고른다.
 * - 보통: 관련도 기준(MIN_DOC_SIMILARITY) 이상만
 * - 「이 문서만 참고」(U4): 그 문서 조각만, 기준 없이(요약처럼 관련도가 낮게 나오는 질문도 답하게)
 */
export function pickDocHits(hits: DocHit[], onlyDocumentId: string | null, limit = 5): DocHit[] {
  if (onlyDocumentId) return hits.filter((h) => h.document_id === onlyDocumentId).slice(0, limit);
  return hits.filter((h) => h.similarity >= MIN_DOC_SIMILARITY).slice(0, limit);
}

/** 같은 문서(이름·크기 같음)를 이미 올렸는지(L5) */
export function isDuplicateDoc(existing: { name: string; size_bytes: number }[], name: string, size: number): boolean {
  return existing.some((d) => d.name === name && d.size_bytes === size);
}

/** 문서 올리기 진행 단계(U2) — 서버가 단계 이름을 보내면 화면이 이 문구로 보여 준다 */
export const UPLOAD_STAGE_LABELS: Record<string, string> = {
  read: "문서에서 글을 읽는 중…",
  chunk: "내용을 조각으로 나누는 중…",
  embed: "조각을 임베딩하는 중…",
  save: "저장하는 중…",
};

export interface Source {
  type: "doc" | "web";
  title: string;
  url?: string;
  /** 문서 출처의 가장 높은 관련도(0~1, 소수 둘째 자리) — 기준값 점검용 */
  score?: number;
  /** 문서 출처: 가장 관련 높은 조각 앞부분(U1) */
  snippet?: string;
  /** 문서 출처: 문서 id(내 문서의 「마지막 사용」 표시용) */
  docId?: string;
  /** 웹 출처: 발행일 */
  published?: string;
  /** 웹 출처: 검색 경로(L6 — MCP가 실패해 REST로 대신한 비율 점검용) */
  via?: "mcp" | "rest";
}

/** 답변 시스템 지시문 — 오늘 날짜·당해 연도 기준, 자료 우선, 모르면 모른다고 */
export function buildSystemPrompt(today: string, docs: DocHit[], web: { title: string; url: string; content: string; published?: string }[]): string {
  const year = today.slice(0, 4);
  const lines = [
    `당신은 「AI 문서 챗봇」입니다. 한국어로 친절하고 정확하게, 핵심부터 답합니다. 목록·굵게 등 마크다운을 써도 됩니다.`,
    `[기준 날짜 엄수: 오늘은 ${today}(한국 시간)이고 현재 연도는 ${year}년입니다. 모든 연도 표기·정보는 ${year}년(당해 연도)을 기준으로 하세요. 과거 연도로 퇴행하지 마세요.]`,
  ];
  if (docs.length) {
    lines.push(`\n[사용자가 올린 문서에서 찾은 내용] — 질문과 관련 있으면 이 내용을 우선 근거로 쓰고, 문서에 없는 내용을 문서에 있는 것처럼 말하지 마세요.`);
    docs.forEach((d, i) => lines.push(`(문서${i + 1}: ${d.document_name})\n${d.content}`));
  }
  if (web.length) {
    lines.push(
      `\n[웹 검색 결과] — 최신 정보는 이 결과를 근거로 답하고, 결과끼리 다르면 그 사실을 알려 주세요.`,
      `"오늘·이번 주·최근"을 묻는 질문인데 결과의 날짜가 그보다 오래됐거나 날짜를 알 수 없으면, 그 내용을 최신 소식처럼 말하지 말고 날짜를 밝히거나 "해당 기간의 소식을 찾지 못했습니다"라고 말하세요.`
    );
    web.forEach((w, i) => lines.push(`(웹${i + 1}: ${w.title} — ${w.url}${w.published ? ` — 발행일 ${w.published}` : ""})\n${w.content}`));
  }
  if (docs.length || web.length) lines.push(`\n근거 자료로 답할 수 없는 부분은 추측하지 말고 "자료에서 찾지 못했습니다"라고 말하세요. 출처 목록은 화면이 따로 보여 주므로 답변 끝에 출처를 다시 나열하지 마세요.`);
  return lines.join("\n");
}

/** 화면에 보여 줄 참고 출처(문서 이름은 중복 제거, 웹은 주소 중복 제거) */
export function buildSources(docs: DocHit[], web: { title: string; url: string; published?: string }[], webVia?: "mcp" | "rest"): Source[] {
  const out: Source[] = [];
  const seenDocs = new Map<string, Source>();
  for (const d of docs) {
    const score = Math.round(d.similarity * 100) / 100;
    const prev = seenDocs.get(d.document_name);
    if (prev) {
      if (score > (prev.score ?? 0)) {
        prev.score = score;
        prev.snippet = snippetOf(d.content);
      }
      continue;
    }
    const src: Source = { type: "doc", title: d.document_name, score, snippet: snippetOf(d.content), ...(d.document_id ? { docId: d.document_id } : {}) };
    seenDocs.set(d.document_name, src);
    out.push(src);
  }
  const seenUrls = new Set<string>();
  for (const w of web) {
    if (seenUrls.has(w.url)) continue;
    seenUrls.add(w.url);
    out.push({ type: "web", title: w.title, url: w.url, ...(w.published ? { published: w.published } : {}), ...(webVia ? { via: webVia } : {}) });
  }
  return out;
}

/** 출처를 눌렀을 때 펼쳐 보여 줄 근거 조각(U1) — 최대 400자 */
function snippetOf(content: string): string {
  const one = content.replace(/\s+/g, " ").trim();
  return one.length > 400 ? `${one.slice(0, 400)}…` : one;
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
  /** 발행일(뉴스 검색에서 Tavily가 주는 경우) */
  published?: string;
}

/** MCP 도구가 돌려준 글(「Title: … URL: … Content: …」 묶음)에서 결과를 뽑는다 */
export function parseMcpSearchText(text: string): WebResult[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const j = JSON.parse(trimmed) as { results?: WebResult[] } | WebResult[];
      const arr = Array.isArray(j) ? j : j.results ?? [];
      return arr
        .filter((r) => r && typeof r.url === "string")
        .map((r) => {
          const pub = (r as { published_date?: unknown }).published_date;
          return { title: String(r.title ?? r.url), url: r.url, content: String(r.content ?? ""), ...(typeof pub === "string" && pub ? { published: pub } : {}) };
        });
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
    const published = /Published Date:\s*(.+)/i.exec(b)?.[1]?.trim();
    const content = (/Content:\s*([\s\S]*)/.exec(b)?.[1]?.trim() ?? "").replace(/\n?Published Date:.*$/im, "").trim();
    out.push({ title, url, content: content.slice(0, 1500), ...(published ? { published } : {}) });
  }
  return out;
}


// ── 혼합 검색(L4): 벡터 유사도 + 키워드 일치 ──────────────────────────────
// 이름·숫자·고유명사(예: 「Orbit X1」, 「39,000」)는 임베딩만으로 놓치기 쉬워, 질문의 핵심 단어가
// 그대로 들어 있는 조각을 함께 찾아 점수를 더한다.

const PARTICLES = ["에서는", "으로는", "에서", "으로", "까지", "부터", "처럼", "보다", "에게", "한테", "이랑", "랑", "은", "는", "이", "가", "을", "를", "의", "에", "로", "와", "과", "도", "만", "요"];
const STOPWORDS = new Set(["알려줘", "알려", "주세요", "해줘", "해주세요", "뭐야", "무엇", "무엇인가요", "얼마", "얼마야", "얼마고", "언제", "언제까지", "어디", "어떻게", "어떤", "그리고", "그런데", "있어", "있나요", "인가요", "내용", "문서", "자료", "관련", "대해", "대한", "정리", "요약", "설명", "the", "and", "for", "what", "how", "is", "are"]);

/** 질문에서 키워드를 뽑는다 — 조사 떼기, 불용어·한 글자 제외, 최대 6개. PostgREST 필터에 안전한 글자만 남김 */
export function extractKeywords(question: string): string[] {
  const out: string[] = [];
  // 「39,000원」처럼 쉼표가 든 숫자는 쪼개면 「000원」 같은 엉뚱한 단어가 되고 쉼표는 검색 조건에 못 쓰므로 빼고(벡터 검색이 찾음) 나머지 단어만 쓴다
  const cleaned = question.replace(/\d{1,3}(?:,\d{3})+\S*/g, " ");
  for (const raw of cleaned.split(/[\s,.?!·~"'()[\]{}<>:;/\\|]+/)) {
    let w = raw.replace(/[^0-9A-Za-z가-힣]/g, "");
    for (const p of PARTICLES) {
      if (w.length > p.length + 1 && w.endsWith(p)) {
        w = w.slice(0, -p.length);
        break;
      }
    }
    if (w.length < 2 && !/^\d+$/.test(w)) continue;
    if (STOPWORDS.has(w.toLowerCase())) continue;
    if (!out.includes(w)) out.push(w);
    if (out.length >= 6) break;
  }
  return out;
}

export interface ChunkHit extends DocHit {
  id: string;
}

/** 키워드가 「구체적」인지 — 영문·숫자가 섞인 모델명·코드·수치는 하나만 일치해도 의미가 있다 */
function isSpecific(k: string): boolean {
  return /[0-9A-Za-z]/.test(k);
}

/** 상위 결과보다 이만큼 이상 점수가 낮은 조각은 근거에서 뺀다(2026-10-19 실데이터: 무관한 문서가 0.09~0.16 아래로 붙음) */
export const RELATIVE_SCORE_GAP = 0.15;

/**
 * 벡터 결과와 키워드 결과를 합쳐 점수순 상위 limit개.
 * - 키워드 점수(최대 +0.25)는 2개 이상 일치하거나 구체적 키워드(영문·숫자)가 일치할 때만 준다(L13 — 「규정」 같은 흔한 단어 하나로 붙지 않게)
 * - 관련도 기준 미만이어도 위 조건으로 키워드가 절반 이상 일치하면 포함
 * - 가장 높은 점수보다 RELATIVE_SCORE_GAP 이상 낮은 조각은 뺀다(단, 위 조건으로 키워드가 절반 이상 일치한 조각은 남김 — 키워드로만 찾은 정확한 조각 보호)
 */
export function mergeHybrid(vectorHits: ChunkHit[], keywordHits: ChunkHit[], keywords: string[], limit = 5): ChunkHit[] {
  const byId = new Map<string, ChunkHit>();
  for (const h of vectorHits) byId.set(h.id, h);
  for (const h of keywordHits) if (!byId.has(h.id)) byId.set(h.id, { ...h, similarity: h.similarity ?? 0 });
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const scored = [...byId.values()].map((h) => {
    const text = h.content.toLowerCase();
    const matched = lowerKeywords.filter((k) => text.includes(k));
    const meaningful = matched.length >= 2 || matched.some(isSpecific);
    const kw = meaningful && lowerKeywords.length ? matched.length / lowerKeywords.length : 0;
    return { h, kw, score: h.similarity + 0.25 * kw };
  });
  const kept = scored.filter((x) => x.h.similarity >= MIN_DOC_SIMILARITY || x.kw >= 0.5).sort((a, b) => b.score - a.score);
  const best = kept[0]?.score ?? 0;
  return kept
    .filter((x) => x.kw >= 0.5 || x.score >= best - RELATIVE_SCORE_GAP)
    .slice(0, limit)
    .map(({ h, score }) => ({ ...h, similarity: Math.min(1, Math.round(score * 100) / 100) }));
}

/** 「요약해 줘·정리해 줘·핵심」처럼 문서 전체를 묻는 질문인지(L12) — 관련도가 낮게 나와도 가장 가까운 문서 앞부분으로 답하게 */
export function isSummaryQuestion(question: string): boolean {
  return /(요약|정리|핵심|주요 ?내용|무슨 ?내용|전체 ?내용|summar)/i.test(question);
}

// ── 큰 문서(L2·L3) ───────────────────────────────────────────────
/** 화면→서버 직접 업로드 한도(Vercel 요청 본문 4.5MB 안) */
export const DIRECT_UPLOAD_MAX = 4 * 1024 * 1024;
/** Storage를 거쳐 올릴 수 있는 최대 크기 */
export const STORAGE_UPLOAD_MAX = 50 * 1024 * 1024;

/** Upstage 비동기 결과(배치)들을 쪽 순서대로 이어 붙인다 */
export function joinBatchTexts(batches: { start_page: number; text: string }[]): string {
  return [...batches].sort((a, b) => a.start_page - b.start_page).map((b) => b.text.trim()).filter(Boolean).join("\n\n");
}

/** Upstage 문서 읽기 결과 JSON에서 글을 꺼낸다(동기·비동기 배치 공통) */
export function textFromParseResult(data: { content?: { markdown?: string; text?: string; html?: string }; elements?: { content?: { markdown?: string; text?: string } }[] }): string {
  const c = data.content ?? {};
  let text = c.markdown || c.text || (c.html ?? "").replace(/<[^>]+>/g, " ");
  if (!text && Array.isArray(data.elements)) text = data.elements.map((e) => e.content?.markdown || e.content?.text || "").filter(Boolean).join("\n");
  return text.replace(/[ \t]+\n/g, "\n").trim();
}

// ── v1.06 화면 편의 ─────────────────────────────────────────────
/** 문서가 조각 한도에 걸려 일부만 저장됐는지(L14) — 마지막 조각이 원문 끝까지 닿지 않으면 잘린 것 */
export function wasTruncated(text: string, chunks: string[]): boolean {
  if (chunks.length < MAX_CHUNKS_PER_DOC) return false;
  const tail = text.replace(/\s+/g, " ").trim().slice(-40);
  return !chunks[chunks.length - 1].replace(/\s+/g, " ").includes(tail);
}

/** 큰 문서 읽기 예상 남은 시간(초). 아직 읽은 쪽이 없거나 계산할 수 없으면 null */
export function estimateRemainingSec(startedAt: number, now: number, completed?: number, total?: number): number | null {
  if (!total || !completed || completed >= total) return null;
  const elapsed = (now - startedAt) / 1000;
  if (elapsed <= 0) return null;
  return Math.round(((total - completed) * elapsed) / completed);
}

/** 문서별 마지막으로 근거로 쓰인 시각 — 답변 출처의 docId(없으면 문서 이름)로 맞춘다 */
export function lastUsedByDoc(
  docs: { id: string; name: string }[],
  answers: { created_at: string; sources?: Source[] | null }[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of answers) {
    for (const s of a.sources ?? []) {
      if (s.type !== "doc") continue;
      const doc = s.docId ? docs.find((d) => d.id === s.docId) : docs.find((d) => d.name === s.title);
      if (doc && (!out[doc.id] || out[doc.id] < a.created_at)) out[doc.id] = a.created_at;
    }
  }
  return out;
}

/** 웹 검색 경로 통계(MCP 처리·REST 대체 비율) — 답변 한 개를 검색 1회로 센다 */
export function webViaStats(answers: { sources?: Source[] | null }[]): { searches: number; mcp: number; rest: number; unknown: number } {
  const st = { searches: 0, mcp: 0, rest: 0, unknown: 0 };
  for (const a of answers) {
    const web = (a.sources ?? []).filter((s) => s.type === "web");
    if (!web.length) continue;
    st.searches++;
    const via = web[0].via;
    if (via === "mcp") st.mcp++;
    else if (via === "rest") st.rest++;
    else st.unknown++;
  }
  return st;
}
