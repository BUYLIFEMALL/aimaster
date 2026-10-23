// 가사 읽기·쓰기 — 화면(브라우저)과 시험(node --test) 양쪽에서 쓰므로 외부 의존 없이 작성한다.
// 시간은 초 단위. 아직 시간이 없는 줄은 start = -1(탭 싱크로 채운다).

export interface LyricLine { id: string; start: number; end: number; text: string }
export type LyricSource = "srt" | "lrc" | "text";
export interface ParseResult { lines: LyricLine[]; source: LyricSource; skipped: number }

const LAST_LINE_SECONDS = 4; // 마지막 줄 끝 시각을 모를 때 보여 줄 길이
export const MAX_LINES = 400;

let seq = 0;
export const newId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

/** 「1:02:03,450」「02:03.4」「2:03」「00:01,000」처럼 조금씩 다른 시간 표기를 초로 바꾼다. 읽지 못하면 NaN */
export function parseTime(raw: string): number {
  const m = raw.trim().match(/^(?:(\d+):)?(\d{1,3}):(\d{1,2})(?:[.,:](\d{1,3}))?$/);
  if (!m) return NaN;
  const [, h, mm, ss, frac] = m;
  const ms = frac ? Number(frac.padEnd(3, "0")) : 0;
  return Number(h ?? 0) * 3600 + Number(mm) * 60 + Number(ss) + ms / 1000;
}

export function formatTime(sec: number, withMs = true): string {
  if (!Number.isFinite(sec) || sec < 0) return "--:--";
  const total = Math.round(sec * 1000);
  const m = Math.floor(total / 60000), s = Math.floor((total % 60000) / 1000), ms = total % 1000;
  const base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return withMs ? `${base}.${String(Math.floor(ms / 10)).padStart(2, "0")}` : base;
}

const clean = (text: string) => text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
/** 자막 안의 꾸밈 태그(<i>, {\an8} 등)는 지우고 글자만 남긴다 */
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "").trim();

/** .srt — 번호가 없거나, 화살표 양옆 공백이 없거나, 줄바꿈이 섞여 있어도 읽는다 */
export function parseSrt(text: string): ParseResult {
  const blocks = clean(text).split(/\n\s*\n/);
  const lines: LyricLine[] = []; let skipped = 0;
  for (const block of blocks) {
    const rows = block.split("\n").map((r) => r.trim()).filter(Boolean);
    const ti = rows.findIndex((r) => r.includes("-->"));
    if (ti < 0) { if (rows.length) skipped++; continue; }
    const [a, b] = rows[ti].split("-->");
    const start = parseTime(a.replace(/\s.*$/, "")), end = parseTime((b ?? "").trim().split(/\s+/)[0] ?? "");
    const body = rows.slice(ti + 1).map(stripTags).filter(Boolean).join("\n");
    if (!Number.isFinite(start) || !body) { skipped++; continue; }
    lines.push({ id: newId(), start, end: Number.isFinite(end) && end > start ? end : start + LAST_LINE_SECONDS, text: body });
  }
  return { lines: sortAndFix(lines), source: "srt", skipped };
}

/** .lrc — 한 줄에 시간표가 여러 개([00:12.00][01:30.00]후렴)여도 각각 한 줄로 만든다. 끝 시각은 다음 줄 시작 */
export function parseLrc(text: string): ParseResult {
  const lines: LyricLine[] = []; let skipped = 0;
  for (const row of clean(text).split("\n")) {
    const tags = [...row.matchAll(/\[(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    if (!tags.length) { if (row.trim() && !/^\[[a-z]+:/i.test(row.trim())) skipped++; continue; }
    const body = stripTags(row.replace(/\[[^\]]*\]/g, "").replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, ""));
    for (const t of tags) {
      const start = parseTime(t[1]);
      if (Number.isFinite(start)) lines.push({ id: newId(), start, end: -1, text: body });
    }
  }
  lines.sort((x, y) => x.start - y.start);
  for (let i = 0; i < lines.length; i++) lines[i].end = i + 1 < lines.length ? lines[i + 1].start : lines[i].start + LAST_LINE_SECONDS;
  // 빈 시간표 줄([00:30.00] 만 있는 줄)은 앞 줄을 거기서 끝내는 표시로 쓰고 버린다
  return { lines: lines.filter((l) => l.text), source: "lrc", skipped };
}

/** 붙여넣은 가사 — 빈 줄은 버리고, 시간은 탭 싱크로 채운다 */
export function parsePlain(text: string): ParseResult {
  const lines = clean(text).split("\n").map((r) => r.trim()).filter(Boolean).map((t) => ({ id: newId(), start: -1, end: -1, text: t }));
  return { lines, source: "text", skipped: 0 };
}

/** 파일 이름이나 내용으로 형식을 고른다 */
export function parseLyrics(text: string, fileName = ""): ParseResult {
  const name = fileName.toLowerCase();
  let r: ParseResult;
  if (name.endsWith(".srt") || /-->/.test(text)) r = parseSrt(text);
  else if (name.endsWith(".lrc") || /^\s*\[\d{1,3}:\d{1,2}/m.test(text)) r = parseLrc(text);
  else r = parsePlain(text);
  if (r.lines.length > MAX_LINES) r = { ...r, lines: r.lines.slice(0, MAX_LINES), skipped: r.skipped + (r.lines.length - MAX_LINES) };
  return r;
}

function sortAndFix(lines: LyricLine[]): LyricLine[] {
  lines.sort((a, b) => a.start - b.start);
  return lines;
}

export const isSynced = (l: LyricLine) => l.start >= 0;
export const allSynced = (lines: LyricLine[]) => lines.length > 0 && lines.every(isSynced);

/** 탭 싱크: i번째 줄을 t초에 시작한다. 앞 줄은 t에서 끝나고(앞 줄 끝이 비었거나 t보다 늦으면), 이 줄 끝은 다음 줄 시작 또는 기본 길이 */
export function stampLine(lines: LyricLine[], i: number, t: number): LyricLine[] {
  const next = lines.map((l) => ({ ...l }));
  next[i].start = Math.max(0, t);
  if (i > 0 && isSynced(next[i - 1]) && (next[i - 1].end < 0 || next[i - 1].end > t || next[i - 1].end <= next[i - 1].start)) next[i - 1].end = t;
  if (next[i].end <= next[i].start) next[i].end = i + 1 < next.length && isSynced(next[i + 1]) ? next[i + 1].start : t + LAST_LINE_SECONDS;
  return next;
}

/** i번째 줄을 t초에 끝낸다(다음 줄 시작보다 이르면 그 사이는 간주). 시작이 없는 줄이나 시작보다 이른 시각은 무시 */
export function endLine(lines: LyricLine[], i: number, t: number): LyricLine[] {
  const l = lines[i];
  if (!l || !isSynced(l) || t <= l.start + 0.05) return lines;
  return lines.map((x, k) => (k === i ? { ...x, end: +t.toFixed(2) } : x));
}

/** 파형에서 끌어 i번째 줄 시작을 t초로 옮긴다 — 앞뒤 줄 시작을 넘지 않고(0.1초 간격), 앞 줄 끝이 맞닿아 있으면 함께 옮긴다 */
export function moveStart(lines: LyricLine[], i: number, t: number): LyricLine[] {
  const l = lines[i];
  if (!l || !isSynced(l)) return lines;
  let p = -1, n = -1;
  for (let k = i - 1; k >= 0; k--) if (isSynced(lines[k])) { p = k; break; }
  for (let k = i + 1; k < lines.length; k++) if (isSynced(lines[k])) { n = k; break; }
  const lo = p >= 0 ? lines[p].start + 0.1 : 0, hi = n >= 0 ? lines[n].start - 0.1 : Infinity;
  const nt = +Math.min(hi, Math.max(lo, t)).toFixed(2);
  return lines.map((x, k) => {
    if (k === i) return { ...x, start: nt, end: x.end > nt + 0.1 ? x.end : n >= 0 ? lines[n].start : nt + LAST_LINE_SECONDS };
    if (k === p && Math.abs(x.end - l.start) < 0.011) return { ...x, end: nt };
    return x;
  });
}

/** 줄 시작을 지운다(탭 싱크 되돌리기) */
export function clearFrom(lines: LyricLine[], i: number): LyricLine[] {
  return lines.map((l, k) => (k >= i ? { ...l, start: -1, end: -1 } : k === i - 1 ? { ...l, end: l.start + LAST_LINE_SECONDS } : l));
}

/** 전체 시간을 dt초만큼 민다(음수면 당김) */
export function shiftAll(lines: LyricLine[], dt: number): LyricLine[] {
  return lines.map((l) => (isSynced(l) ? { ...l, start: Math.max(0, l.start + dt), end: Math.max(0.1, l.end + dt) } : l));
}

/** 시간이 있는 줄만 시작 순서로, 끝 시각이 다음 줄과 겹치지 않게 정리한다(그리기·내보내기용) */
export function timeline(lines: LyricLine[], duration = Infinity): LyricLine[] {
  const s = lines.filter(isSynced).map((l) => ({ ...l })).sort((a, b) => a.start - b.start);
  for (let i = 0; i < s.length; i++) {
    const limit = i + 1 < s.length ? s[i + 1].start : duration;
    if (!(s[i].end > s[i].start)) s[i].end = Math.min(limit, s[i].start + LAST_LINE_SECONDS);
    if (s[i].end > limit) s[i].end = limit;
  }
  return s;
}

/** t초에 보여 줄 줄 번호. 두 줄 사이(간주)면 앞 줄 번호와 gap=true */
export function lineAt(tl: LyricLine[], t: number): { index: number; gap: boolean } {
  if (!tl.length || t < tl[0].start) return { index: -1, gap: true };
  let lo = 0, hi = tl.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tl[mid].start <= t) lo = mid; else hi = mid - 1; }
  return { index: lo, gap: t >= tl[lo].end };
}

/** 시간표를 표준 .srt로 */
export function toSrt(lines: LyricLine[]): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const ts = (sec: number) => { const ms = Math.round(sec * 1000); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  return timeline(lines).map((l, i) => `${i + 1}\n${ts(l.start)} --> ${ts(l.end)}\n${l.text}\n`).join("\n");
}
