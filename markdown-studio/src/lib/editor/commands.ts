// 마크다운 서식 명령(순수 함수). 편집기(CodeMirror)와 무관하게 (본문, 선택) → (새 본문, 새 선택)만 계산한다.
export interface Sel { from: number; to: number }
export interface Result { text: string; sel: Sel }

const clampSel = (text: string, s: Sel): Sel => {
  const a = Math.max(0, Math.min(text.length, Math.min(s.from, s.to)));
  const b = Math.max(0, Math.min(text.length, Math.max(s.from, s.to)));
  return { from: a, to: b };
};
const result = (text: string, from: number, to = from): Result => ({ text, sel: { from, to } });

/** 선택이 걸친 모든 줄의 [시작, 끝) 범위. 선택 끝이 줄 맨 앞이면 그 줄은 제외한다 */
export function lineSpan(text: string, s: Sel): Sel {
  const { from, to } = clampSel(text, s);
  const start = text.lastIndexOf("\n", from - 1) + 1;
  const endRef = to > from && text[to - 1] === "\n" ? to - 1 : to;
  const nl = text.indexOf("\n", endRef);
  return { from: start, to: nl === -1 ? text.length : nl };
}

function mapLines(text: string, s: Sel, fn: (line: string, index: number) => string): Result {
  const span = lineSpan(text, s);
  const lines = text.slice(span.from, span.to).split("\n");
  const out = lines.map(fn).join("\n");
  return result(text.slice(0, span.from) + out + text.slice(span.to), span.from, span.from + out.length);
}

// ---- 줄 머리 표식 ----
const HEADING = /^(#{1,6})[ \t]+/;
const TASK = /^(\s*)[-*+][ \t]+\[[ xX]\][ \t]+/;
const BULLET = /^(\s*)[-*+][ \t]+/;
const NUMBER = /^(\s*)(\d{1,9})[.)][ \t]+/;
const ALPHA = /^(\s*)([a-z])[.)][ \t]+/;
export type ListKind = "bullet" | "number" | "alpha" | "task";

export function parseListLine(line: string): { kind: ListKind; indent: string; marker: string; body: string; value?: string } | null {
  let m = line.match(TASK);
  if (m) return { kind: "task", indent: m[1], marker: m[0], body: line.slice(m[0].length) };
  m = line.match(BULLET);
  if (m) return { kind: "bullet", indent: m[1], marker: m[0], body: line.slice(m[0].length) };
  m = line.match(NUMBER);
  if (m) return { kind: "number", indent: m[1], marker: m[0], body: line.slice(m[0].length), value: m[2] };
  m = line.match(ALPHA);
  if (m) return { kind: "alpha", indent: m[1], marker: m[0], body: line.slice(m[0].length), value: m[2] };
  return null;
}
const markerFor = (kind: ListKind, n: number) => kind === "bullet" ? "- " : kind === "task" ? "- [ ] " : kind === "number" ? `${n + 1}. ` : `${String.fromCharCode(97 + (n % 26))}. `;

// ---- 제목 / 인용 / 목록 ----
export function toggleHeading(text: string, sel: Sel, level: 1 | 2 | 3): Result {
  const prefix = "#".repeat(level) + " ";
  const span = lineSpan(text, sel);
  const lines = text.slice(span.from, span.to).split("\n").filter(l => l.trim());
  const allSame = lines.length > 0 && lines.every(l => l.match(HEADING)?.[1].length === level);
  return mapLines(text, sel, line => {
    if (!line.trim()) return line;
    const body = line.replace(HEADING, "");
    return allSame ? body : prefix + body;
  });
}

export function toggleQuote(text: string, sel: Sel): Result {
  const span = lineSpan(text, sel);
  const lines = text.slice(span.from, span.to).split("\n").filter(l => l.trim());
  const all = lines.length > 0 && lines.every(l => /^>\s?/.test(l));
  return mapLines(text, sel, line => !line.trim() ? line : all ? line.replace(/^>[ \t]?/, "") : "> " + line);
}

export function setList(text: string, sel: Sel, kind: ListKind): Result {
  const span = lineSpan(text, sel);
  const lines = text.slice(span.from, span.to).split("\n").filter(l => l.trim());
  const all = lines.length > 0 && lines.every(l => parseListLine(l)?.kind === kind);
  let n = 0;
  return mapLines(text, sel, line => {
    if (!line.trim()) return line;
    const p = parseListLine(line);
    const indent = p?.indent ?? (line.match(/^\s*/)?.[0] ?? "");
    const body = p ? p.body : line.slice(indent.length);
    if (all) return indent + body;
    return indent + markerFor(kind, n++) + body;
  });
}

export function indentLines(text: string, sel: Sel): Result {
  return mapLines(text, sel, line => line.trim() ? "  " + line : line);
}
export function outdentLines(text: string, sel: Sel): Result {
  return mapLines(text, sel, line => line.replace(/^(\t| {1,2})/, ""));
}

// ---- 글자 서식 ----
export function toggleWrap(text: string, sel: Sel, mark: string): Result {
  const { from, to } = clampSel(text, sel);
  const n = mark.length;
  const selected = text.slice(from, to);
  const boldNeighbor = (i: number) => mark === "*" && text[i] === "*";
  // 선택 바깥을 표식이 감싸고 있으면 해제
  if (from >= n && text.slice(from - n, from) === mark && text.slice(to, to + n) === mark && !boldNeighbor(from - n - 1) && !boldNeighbor(to + n)) {
    return result(text.slice(0, from - n) + selected + text.slice(to + n), from - n, to - n);
  }
  // 선택 안쪽이 표식으로 시작·끝나면 해제
  if (selected.length >= 2 * n && selected.startsWith(mark) && selected.endsWith(mark) && !(mark === "*" && selected.startsWith("**"))) {
    const inner = selected.slice(n, selected.length - n);
    return result(text.slice(0, from) + inner + text.slice(to), from, from + inner.length);
  }
  if (from === to) return result(text.slice(0, from) + mark + mark + text.slice(to), from + n);
  return result(text.slice(0, from) + mark + selected + mark + text.slice(to), from + n, to + n);
}

// ---- 삽입 ----
const SAFE_URL = /^(https?:\/\/[^\s]+|mailto:[^\s]+|#[^\s]*|\/[^\s]*|\.{1,2}\/[^\s]*|[^:\s]+)$/i;
/** 링크·이미지 주소 검사: http(s), mailto, 앵커, 상대 경로만 허용 (javascript: 등 차단) */
export function validateUrl(url: string): string | null {
  const u = url.trim();
  if (!u || /[\u0000-\u001f]/.test(u)) return null;
  if (/^(https?:|mailto:)/i.test(u)) return SAFE_URL.test(u) ? u.replace(/\)/g, "%29").replace(/\(/g, "%28") : null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null;
  return SAFE_URL.test(u) ? u.replace(/\)/g, "%29").replace(/\(/g, "%28") : null;
}

export function insertLink(text: string, sel: Sel, url: string): Result | null {
  const safe = validateUrl(url);
  if (!safe) return null;
  const { from, to } = clampSel(text, sel);
  const label = text.slice(from, to) || "링크 텍스트";
  const out = `[${label}](${safe})`;
  return result(text.slice(0, from) + out + text.slice(to), from + 1, from + 1 + label.length);
}
export function insertImage(text: string, sel: Sel, url: string): Result | null {
  const safe = validateUrl(url);
  if (!safe) return null;
  const { from, to } = clampSel(text, sel);
  const alt = text.slice(from, to) || "이미지 설명";
  const out = `![${alt}](${safe})`;
  return result(text.slice(0, from) + out + text.slice(to), from + 2, from + 2 + alt.length);
}

export function insertText(text: string, sel: Sel, value: string): Result {
  const { from, to } = clampSel(text, sel);
  return result(text.slice(0, from) + value + text.slice(to), from + value.length);
}

export const CODE_LANGUAGES = ["", "javascript", "typescript", "python", "json", "bash", "html", "css", "sql"] as const;
export function insertCodeBlock(text: string, sel: Sel, lang = ""): Result {
  const { from, to } = clampSel(text, sel);
  const selected = text.slice(from, to);
  const before = from > 0 && text[from - 1] !== "\n" ? "\n" : "";
  const after = to < text.length && text[to] !== "\n" ? "\n" : "";
  const fence = selected.includes("```") ? "````" : "```";
  const head = `${before}${fence}${lang}\n`;
  const out = head + (selected ? selected + (selected.endsWith("\n") ? "" : "\n") : "\n") + fence + after;
  const caret = selected ? from + out.length : from + head.length;
  return result(text.slice(0, from) + out + text.slice(to), caret);
}

export function insertRule(text: string, sel: Sel): Result {
  const { to } = clampSel(text, sel);
  const nl = text.indexOf("\n", to);
  const end = nl === -1 ? text.length : nl;
  const lineStart = text.lastIndexOf("\n", to - 1) + 1;
  const lineEmpty = !text.slice(lineStart, end).trim();
  const ins = (lineEmpty ? "" : "\n\n") + "---\n\n";
  const insertAt = lineEmpty ? lineStart : end;
  const rest = lineEmpty ? text.slice(end === lineStart ? end : end) : text.slice(end);
  const base = text.slice(0, insertAt) + ins + (lineEmpty ? rest.replace(/^\n/, "") : rest.replace(/^\n/, ""));
  return result(base, insertAt + ins.length);
}

// ---- 목록에서 Enter ----
/** 커서가 목록 줄에 있을 때 Enter의 결과. 목록이 아니면 null (기본 동작 사용) */
export function listEnter(text: string, caret: number): Result | null {
  const pos = Math.max(0, Math.min(text.length, caret));
  const start = text.lastIndexOf("\n", pos - 1) + 1;
  const nl = text.indexOf("\n", pos);
  const end = nl === -1 ? text.length : nl;
  const line = text.slice(start, end);
  const p = parseListLine(line);
  if (!p) return null;
  if (pos - start < p.marker.length) return null; // 표식 안쪽 커서는 기본 동작
  if (!p.body.trim() && pos === end) { // 빈 항목: 목록 종료
    return result(text.slice(0, start) + p.indent + text.slice(end), start + p.indent.length);
  }
  const next = p.kind === "number" ? `${Number(p.value) + 1}. ` : p.kind === "alpha" ? `${String.fromCharCode(p.value!.charCodeAt(0) === 122 ? 97 : p.value!.charCodeAt(0) + 1)}. ` : p.kind === "task" ? "- [ ] " : markerFor(p.kind, 0);
  const ins = "\n" + p.indent + next;
  return result(text.slice(0, pos) + ins + text.slice(pos), pos + ins.length);
}

// ---- 표 ----
export type Align = "left" | "center" | "right";
interface Table { start: number; end: number; rows: string[][]; aligns: Align[]; cursorRow: number; cursorCol: number }

function splitCells(line: string): { cells: string[]; delims: number[] } {
  const delims: number[] = [];
  const cells: string[] = [];
  let cur = "";
  let tick = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && line[i + 1] === "|") { cur += "\\|"; i++; continue; }
    if (c === "`") { let k = i; while (line[k] === "`") k++; const run = k - i; tick = tick === 0 ? run : tick === run ? 0 : tick; cur += line.slice(i, k); i = k - 1; continue; }
    if (c === "|" && tick === 0) { delims.push(i); cells.push(cur); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur);
  const lead = line.trim().startsWith("|");
  const trail = line.trim().endsWith("|") && !line.trimEnd().endsWith("\\|");
  let out = cells.map(s => s.trim());
  if (lead) out = out.slice(1);
  if (trail) out = out.slice(0, -1);
  return { cells: out, delims };
}
const SEPARATOR = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const alignOf = (cell: string): Align => cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left";
const sepCell = (a: Align) => a === "center" ? ":---:" : a === "right" ? "---:" : ":---";

function findTable(text: string, caret: number): Table | null {
  const lines = text.split("\n");
  const offsets: number[] = [];
  let o = 0;
  for (const l of lines) { offsets.push(o); o += l.length + 1; }
  let idx = offsets.findIndex((s, i) => caret >= s && caret <= s + lines[i].length);
  if (idx < 0) return null;
  // 코드 펜스 안은 표로 취급하지 않음
  let fence = false;
  for (let i = 0; i < idx; i++) if (/^\s*(```|~~~)/.test(lines[i])) fence = !fence;
  if (fence || /^\s*(```|~~~)/.test(lines[idx])) return null;
  const isRow = (l: string) => l.includes("|") && l.trim() !== "";
  let a = idx, b = idx;
  while (a > 0 && isRow(lines[a - 1])) a--;
  while (b < lines.length - 1 && isRow(lines[b + 1])) b++;
  if (!isRow(lines[idx]) || b - a < 1 || !SEPARATOR.test(lines[a + 1]) || !lines[a + 1].includes("-")) return null;
  const rows = lines.slice(a, b + 1).map(l => splitCells(l).cells);
  const cols = rows[0].length;
  const aligns = rows[1].map(alignOf);
  while (aligns.length < cols) aligns.push("left");
  const { delims } = splitCells(lines[idx]);
  const caretOff = caret - offsets[idx];
  let col = delims.filter(d => d < caretOff).length;
  if (lines[idx].trim().startsWith("|")) col -= 1;
  return { start: offsets[a], end: offsets[b] + lines[b].length, rows, aligns, cursorRow: idx - a, cursorCol: Math.max(0, Math.min(cols - 1, col)) };
}
function renderTable(rows: string[][], aligns: Align[]): string {
  const cols = aligns.length;
  const norm = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? "");
  const line = (r: string[]) => "| " + norm(r).join(" | ") + " |";
  const sep = "| " + aligns.map(sepCell).join(" | ") + " |";
  return [line(rows[0]), sep, ...rows.slice(2).map(line)].join("\n");
}
function applyTable(text: string, t: Table, rows: string[][], aligns: Align[], caretRow: number): Result {
  const out = renderTable(rows, aligns);
  const lines = out.split("\n");
  const caretLine = Math.max(0, Math.min(lines.length - 1, caretRow));
  const caret = t.start + lines.slice(0, caretLine).join("\n").length + (caretLine ? 1 : 0) + 2;
  return result(text.slice(0, t.start) + out + text.slice(t.end), caret);
}

export function createTable(text: string, sel: Sel, cols = 3, rows = 2): Result {
  const c = Math.max(1, Math.min(12, Math.floor(cols)));
  const r = Math.max(1, Math.min(50, Math.floor(rows)));
  const aligns: Align[] = Array.from({ length: c }, () => "left");
  const data = [Array.from({ length: c }, (_, i) => `제목 ${i + 1}`), [], ...Array.from({ length: r }, () => [] as string[])];
  const table = renderTable(data, aligns);
  const { from, to } = clampSel(text, sel);
  const before = from > 0 && text[from - 1] !== "\n" ? "\n\n" : from > 0 && text[from - 2] !== "\n" ? "\n" : "";
  const after = to < text.length && text[to] !== "\n" ? "\n\n" : "\n";
  const out = before + table + after;
  return result(text.slice(0, from) + out + text.slice(to), from + before.length + 2, from + before.length + 2 + "제목 1".length);
}
export function tableAddRow(text: string, sel: Sel): Result | null {
  const t = findTable(text, clampSel(text, sel).to); if (!t) return null;
  const rows = t.rows.map(r => r.slice());
  const at = Math.max(2, t.cursorRow + 1);
  rows.splice(at, 0, Array(t.aligns.length).fill(""));
  return applyTable(text, t, rows, t.aligns, at);
}
export function tableAddColumn(text: string, sel: Sel): Result | null {
  const t = findTable(text, clampSel(text, sel).to); if (!t) return null;
  const at = Math.min(t.aligns.length, t.cursorCol + 1);
  const rows = t.rows.map((r, i) => { const x = Array.from({ length: t.aligns.length }, (_, k) => r[k] ?? ""); x.splice(at, 0, i === 0 ? `제목 ${t.aligns.length + 1}` : ""); return x; });
  const aligns = t.aligns.slice(); aligns.splice(at, 0, "left");
  return applyTable(text, t, rows, aligns, t.cursorRow);
}
export function tableDeleteRow(text: string, sel: Sel): Result | null {
  const t = findTable(text, clampSel(text, sel).to); if (!t || t.cursorRow < 2) return null;
  const rows = t.rows.map(r => r.slice()); rows.splice(t.cursorRow, 1);
  return applyTable(text, t, rows, t.aligns, Math.min(t.cursorRow, rows.length - 1));
}
export function tableDeleteColumn(text: string, sel: Sel): Result | null {
  const t = findTable(text, clampSel(text, sel).to); if (!t || t.aligns.length < 2) return null;
  const rows = t.rows.map(r => { const x = Array.from({ length: t.aligns.length }, (_, k) => r[k] ?? ""); x.splice(t.cursorCol, 1); return x; });
  const aligns = t.aligns.slice(); aligns.splice(t.cursorCol, 1);
  return applyTable(text, t, rows, aligns, t.cursorRow);
}
export function tableSetAlign(text: string, sel: Sel, align: Align): Result | null {
  const t = findTable(text, clampSel(text, sel).to); if (!t) return null;
  const aligns = t.aligns.slice(); aligns[t.cursorCol] = align;
  return applyTable(text, t, t.rows, aligns, t.cursorRow);
}
export const inTable = (text: string, caret: number) => findTable(text, caret) !== null;

// ---- 특수기호 32개 (원본 동일) ----
export const SYMBOLS = ["★", "☆", "✓", "✕", "→", "←", "↑", "↓", "↔", "©", "®", "™", "€", "¥", "£", "§", "¶", "•", "○", "●", "▲", "▼", "∞", "≠", "≈", "≤", "≥", "±", "α", "β", "Ω", "µ"] as const;
