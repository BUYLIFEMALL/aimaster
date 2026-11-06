// 가사 시간(2026-11-06) — 원본 boks-music `electron/lyric-lines.mjs`·`lyric-file.mjs`·`lyric-timing.mjs`(MIT, © 2026 boksajang)를 옮김.
// 곡 가사의 「부르는 줄」마다 시작·끝 시각을 둔다. 저장 칸: free_music_tracks.lyric_timing(jsonb).
// 다른 점: 가사 지문은 node:crypto 대신 crypto.subtle(브라우저·서버 공통), 내보내기는 LRC와 SRT 둘 다.
// 순수 함수 — 시험 tests/lyricTiming.test.mjs.

export type CueStatus = "automatic" | "manual" | "review";
export type Cue = { lineId: string; text: string; start: number | null; end: number | null; status: CueStatus };
export type LyricTiming = { lyricsHash: string; duration: number; status: CueStatus; cues: Cue[] };
export type LyricLine = { lineId: string; text: string };
export type TimedEntry = { start: number; end: number | null; text: string };

export const LYRIC_FILE_LIMITS = Object.freeze({ maxBytes: 1024 * 1024, maxLines: 500, maxLyricsCharacters: 10000 });

// ── 부르는 줄(원본 lyric-lines.mjs) ─────────────────────────
/** [구간 표시]는 지우고 (괄호)는 괄호만 벗긴 「부르는 줄」 목록. 원래 가사는 바꾸지 않는다. */
export function lyricLines(lyrics: string): LyricLine[] {
  const stack: number[] = [];
  const spans: [number, number][] = [];
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i] === "[") stack.push(i);
    else if (lyrics[i] === "]" && stack.length) spans.push([stack.pop()!, i]);
  }
  const removed = new Uint8Array(lyrics.length);
  for (const [s, e] of spans) removed.fill(1, s, e + 1);
  let text = "";
  for (let i = 0; i < lyrics.length; i++) text += removed[i] && !/[\r\n]/.test(lyrics[i]) ? " " : /[()（）]/.test(lyrics[i]) ? " " : lyrics[i];
  return text
    .split(/\r\n|\n|\r/)
    .map((l) => l.replace(/[^\S\r\n]+/g, " ").trim())
    .filter(Boolean)
    .map((t, i) => ({ lineId: `line-${i + 1}`, text: t }));
}

/** 가사 지문 — 가사가 바뀌면 지난 시간 정보는 맞지 않는다 */
export async function hashLyrics(lyrics: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lyrics));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── 파일 읽기(원본 lyric-file.mjs) ─────────────────────────
const FORMATS: Record<string, "LRC" | "SRT" | "VTT"> = { ".lrc": "LRC", ".srt": "SRT", ".vtt": "VTT" };
export function lyricFileFormat(name: string): "LRC" | "SRT" | "VTT" {
  const f = FORMATS[String(name).toLowerCase().match(/\.[^./\\]+$/)?.[0] || ""];
  if (!f) throw new Error("LRC·SRT·VTT 파일을 골라 주세요.");
  return f;
}

/** UTF-8(BOM 있든 없든)·UTF-16(BOM)·그 밖에는 한국어 윈도우 글자(EUC-KR) */
export function decodeLyricFile(input: Uint8Array | ArrayBuffer): string {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length > LYRIC_FILE_LIMITS.maxBytes) throw new Error("가사 시간 파일은 1MB 이하만 불러올 수 있습니다.");
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder("utf-8").decode(b.subarray(3));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    return new TextDecoder("euc-kr").decode(b);
  }
}

const fraction = (d?: string) => (d ? Number(`0.${d}`) : 0);
const ms = (s: number) => Math.round(s * 1000) / 1000;
export function lrcTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 1000));
  const m = Math.floor(total / 60000);
  const rest = total % 60000;
  return `[${String(m).padStart(2, "0")}:${String(Math.floor(rest / 1000)).padStart(2, "0")}.${String(rest % 1000).padStart(3, "0")}]`;
}
const clock = (s: number) => {
  const w = Math.floor(s + 0.0005);
  return `${Math.floor(w / 60)}:${String(w % 60).padStart(2, "0")}`;
};
const shown = (t: string) => lyricLines(t).map((l) => l.text).join(" ");
const sung = (t: string) => /[\p{L}\p{N}]/u.test(shown(t));

const SRT_TIME = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})/;
export function srtToLrc(text: string): string {
  const parsed: { start: number; end: number; lines: string[] }[] = [];
  for (const raw of text.split(/\r\n|\n|\r/)) {
    const line = raw.trim();
    if (line.includes("-->")) {
      const m = SRT_TIME.exec(line);
      if (!m) throw new Error(`인식할 수 없는 SRT 시간 형식입니다: ${line.slice(0, 40)}`);
      const prev = parsed.at(-1);
      if (prev && /^\d+$/.test(prev.lines.at(-1) || "")) prev.lines.pop(); // 다음 자막의 번호
      const start = Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + fraction(m[4]);
      const end = Number(m[5] || 0) * 3600 + Number(m[6]) * 60 + Number(m[7]) + fraction(m[8]);
      if (!(end > start)) throw new Error(`SRT ${parsed.length + 1}번째 자막의 끝 시간이 시작보다 앞에 있습니다.`);
      parsed.push({ start, end, lines: [] });
    } else if (line && parsed.length) parsed.at(-1)!.lines.push(line);
  }
  if (!parsed.length) throw new Error("SRT 파일에서 자막 시간을 찾지 못했습니다.");
  const cues = parsed
    .map((c) => ({ start: c.start, end: c.end, text: c.lines.join(" ").replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "").replace(/\s+/g, " ").trim() }))
    .filter((c) => c.text)
    .sort((a, b) => a.start - b.start);
  if (!cues.length) throw new Error("SRT 파일에 자막 내용이 없습니다.");
  const out: string[] = [];
  cues.forEach((c, i) => {
    const next = cues[i + 1];
    out.push(lrcTime(c.start) + c.text);
    if (!next || c.end < next.start) out.push(lrcTime(c.end));
  });
  return `${out.join("\n")}\n`;
}

const LRC_TIME = /^\[(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?\]\s*/;
export function parseLrc(text: string): TimedEntry[] {
  let offset = 0;
  const stamps: { time: number; text: string; order: number }[] = [];
  for (const raw of text.split(/\r\n|\n|\r/)) {
    const line = raw.trim();
    if (!line) continue;
    let rest = line;
    const times: number[] = [];
    for (let m = LRC_TIME.exec(rest); m; m = LRC_TIME.exec(rest)) {
      times.push(Number(m[1]) * 60 + Number(m[2]) + fraction(m[3]));
      rest = rest.slice(m[0].length);
    }
    if (/^\[\d+:/.test(rest)) throw new Error(`인식할 수 없는 LRC 시간 형식입니다: ${rest.slice(0, 40)}`);
    if (!times.length) {
      const tag = /^\[([A-Za-z#]+)\s*:(.*)\]$/.exec(line); // [offset:+500]은 가사를 그만큼 앞당긴다
      if (tag?.[1].toLowerCase() === "offset" && Number.isFinite(Number(tag[2].trim()))) offset = Number(tag[2].trim());
      continue;
    }
    const words = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, "").replace(/\s+/g, " ").trim();
    for (const time of times) stamps.push({ time, text: words, order: stamps.length });
  }
  if (!stamps.length) throw new Error("파일에서 [분:초] 형식의 가사 시간을 찾지 못했습니다.");
  stamps.sort((a, b) => a.time - b.time || a.order - b.order);
  const entries: TimedEntry[] = [];
  for (const s of stamps) {
    const start = ms(Math.max(0, s.time - offset / 1000));
    const last = entries.at(-1);
    if (!sung(s.text)) {
      if (last && last.end === null && start > last.start) last.end = start;
      continue;
    }
    if (last && start <= last.start) throw new Error(`${clock(start)}에 가사가 두 줄 있습니다(「${last.text}」, 「${s.text}」). 한 시간에는 한 줄만 둘 수 있습니다.`);
    entries.push({ start, end: null, text: s.text });
  }
  if (!entries.length) throw new Error("파일에 시간이 지정된 가사가 없습니다.");
  if (entries.length > LYRIC_FILE_LIMITS.maxLines) throw new Error(`가사 줄은 ${LYRIC_FILE_LIMITS.maxLines}줄까지 불러올 수 있습니다.`);
  return entries;
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", nbsp: " ", lrm: "", rlm: "" };
export function vttToSrt(text: string): string {
  const cues: string[] = [];
  for (const block of text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/)) {
    const lines = block.split("\n");
    const t = lines.findIndex((l) => l.includes("-->"));
    if (t >= 0) cues.push(lines.slice(t).join("\n"));
  }
  if (!cues.length) throw new Error("자막에서 시간을 찾지 못했습니다.");
  const decode = (v: string) =>
    v.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (whole, name: string) =>
      name[0] === "#" ? String.fromCodePoint(parseInt(name.slice(1).replace(/^x/i, ""), /^#x/i.test(name) ? 16 : 10)) : ENTITIES[name.toLowerCase()] ?? whole
    );
  return `${cues.map((c, i) => `${i + 1}\n${decode(c)}`).join("\n\n")}\n`;
}

export function parseLyricTimingFile(name: string, bytes: Uint8Array | ArrayBuffer): TimedEntry[] {
  const f = lyricFileFormat(name);
  const text = decodeLyricFile(bytes);
  const lrc = f === "LRC" ? text : srtToLrc(f === "VTT" ? vttToSrt(text) : text);
  return parseLrc(f === "LRC" ? lrc : lrc.replace(/[♪♫♬]/g, " "));
}

/** 표시용 끝 시각 — 다음 줄 시작(또는 곡 끝)까지, 파일에 끝이 있으면 그보다 늦지 않게 */
export function automaticDisplayEnds<T extends { start: number | null; end: number | null }>(cues: T[], duration: number): T[] {
  return cues.map((c, i) => {
    if (c.start === null || !Number.isFinite(c.start) || c.start < 0 || c.start >= duration) return { ...c, end: null };
    const next = cues[i + 1]?.start;
    const limit = next !== null && next !== undefined && Number.isFinite(next) && next > c.start ? Math.min(next, duration) : duration;
    const end = c.end !== null && Number.isFinite(c.end) && c.end > c.start ? Math.min(c.end, limit) : limit;
    return { ...c, end };
  });
}

/**
 * 파일을 곡에 맞춘 결과 — 곡 가사와 줄이 같으면(글자·숫자만 비교) 가사는 그대로, 다르면 파일의 줄이 곡 가사가 된다
 * (시간은 언제나 그 시간을 만든 가사에 붙어야 하므로). 불러온 시작은 「직접 확인」(manual)으로 친다.
 */
export function planLyricTimingImport(entries: TimedEntry[], lyrics: string, duration: number): { matches: boolean; lyrics: string; cues: Cue[] } {
  if (!entries.length) throw new Error("불러올 가사 시간이 없습니다.");
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("곡 길이를 확인할 수 없습니다.");
  const late = entries.findIndex((e) => e.start >= duration);
  if (late >= 0) throw new Error(`파일의 ${late + 1}번째 가사 시간(${clock(entries[late].start)})이 곡 길이(${clock(duration)})를 넘습니다. 이 곡의 파일이 맞는지 확인해 주세요.`);
  const key = (t: string) => t.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const current = lyricLines(lyrics || "");
  const matches = current.length === entries.length && current.every((l, i) => key(l.text) === key(shown(entries[i].text)));
  const next = matches ? lyrics : entries.map((e) => e.text).join("\n");
  if (next.length > LYRIC_FILE_LIMITS.maxLyricsCharacters) throw new Error("파일의 가사가 10,000자를 넘습니다.");
  const lines = lyricLines(next);
  if (lines.length !== entries.length) throw new Error("파일의 가사 줄을 곡 가사로 옮기지 못했습니다.");
  const cues = automaticDisplayEnds(
    lines.map((l, i) => ({ ...l, start: entries[i].start, end: entries[i].end, status: "manual" as CueStatus })),
    duration
  );
  return { matches, lyrics: next, cues };
}

/** 화면 배지 — 가사가 그대로이고 시작이 하나라도 있으면 「준비됨」 또는 「확인 필요 n줄」 */
export function lyricTimingState(timing: LyricTiming | null | undefined, lyrics: string, lyricsHash: string): { state: "ready" | "review" | null; review: number } {
  if (!timing?.cues?.length || timing.lyricsHash !== lyricsHash) return { state: null, review: 0 };
  if (timing.cues.length !== lyricLines(lyrics).length || !timing.cues.some((c) => c.start !== null)) return { state: null, review: 0 };
  const review = timing.cues.filter((c) => c.status === "review" || c.start === null).length;
  return { state: review ? "review" : "ready", review };
}

/** 저장 전 검사 — 줄 수·순서(시작이 앞줄보다 늦게)·곡 길이 안 */
export function checkCues(cues: Cue[], lines: LyricLine[], duration: number): string | null {
  if (cues.length !== lines.length) return "가사 줄 수와 시간 수가 맞지 않습니다.";
  let prev = -1;
  for (let i = 0; i < cues.length; i++) {
    const s = cues[i].start;
    if (s === null) continue;
    if (!Number.isFinite(s) || s < 0 || s >= duration) return `${i + 1}번째 줄 시간이 곡 길이 안에 있어야 합니다.`;
    if (s <= prev) return `${i + 1}번째 줄 시작이 앞 줄보다 늦어야 합니다.`;
    prev = s;
  }
  return null;
}

// ── 내보내기(원본 subtitles.mjs) ──────────────────────────
export function toLrc(cues: Cue[], meta: { title?: string } = {}): string {
  const out: string[] = meta.title ? [`[ti:${meta.title}]`] : [];
  cues.forEach((c, i) => {
    if (c.start === null) return;
    out.push(lrcTime(c.start) + c.text);
    const next = cues[i + 1]?.start;
    if (c.end !== null && (next === null || next === undefined || c.end < next)) out.push(lrcTime(c.end)); // 사이가 비면 끝 표시
  });
  return `${out.join("\n")}\n`;
}
const srtClock = (s: number) => {
  const t = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const sec = Math.floor((t % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(t % 1000).padStart(3, "0")}`;
};
export function toSrt(cues: Cue[]): string {
  return cues
    .filter((c) => c.start !== null && c.end !== null)
    .map((c, i) => `${i + 1}\n${srtClock(c.start!)} --> ${srtClock(c.end!)}\n${c.text}\n`)
    .join("\n");
}

/** DB에서 읽은 값 검사(PATCH) — 모양이 틀리면 null */
export function parseLyricTiming(v: unknown): LyricTiming | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  if (typeof t.lyricsHash !== "string" || !/^[0-9a-f]{64}$/.test(t.lyricsHash) || typeof t.duration !== "number" || !(t.duration > 0) || t.duration > 3600) return null;
  if (!Array.isArray(t.cues) || !t.cues.length || t.cues.length > LYRIC_FILE_LIMITS.maxLines) return null;
  const okStatus = (s: unknown): s is CueStatus => s === "automatic" || s === "manual" || s === "review";
  const num = (x: unknown) => x === null || (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 3600);
  const cues: Cue[] = [];
  for (const c of t.cues as Record<string, unknown>[]) {
    if (!c || typeof c.lineId !== "string" || typeof c.text !== "string" || c.text.length > 500 || !num(c.start) || !num(c.end) || !okStatus(c.status)) return null;
    cues.push({ lineId: c.lineId.slice(0, 20), text: c.text, start: c.start as number | null, end: c.end as number | null, status: c.status });
  }
  return { lyricsHash: t.lyricsHash, duration: t.duration, status: okStatus(t.status) ? t.status : "manual", cues };
}
