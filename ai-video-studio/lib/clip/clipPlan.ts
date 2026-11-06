// v1.27(V1) 긴 영상 → 쇼츠: 무음 찾기·문장 정리·구간 보정·조각 만들기·SRT(화면·서버 공용 순수 함수).
// 사전 검증 결과(docs/PLAN_20261106_V1_LONG_TO_SHORTS.md §1)를 반영했다:
//   문장 경계는 정확, 낱말 시각은 최대 0.7초 어긋남 → 자르는 단위 = 문장, 자막 = 문장(길면 글자 비례로 나눔)
//   받아쓰기가 끝부분에 없는 말을 붙임 → 무음 안의 아주 짧은 문장은 버림
//   AI가 길이 규칙을 어김 → 코드가 15~45초로 보정

export type Seg = { start: number; end: number; text: string };
export type Silence = [number, number];
export type Pick = { first: number; last: number; score: number; title: string; reason: string };
export type Piece = { start: number; end: number; caption: string };

export const MAX_SOURCE_S = 600;
export const MIN_CLIP_S = 15;
export const MAX_CLIP_S = 45;
export const SILENCE_DB = -35;
export const SILENCE_MIN_S = 1.2;
/** 무음 줄이기: 긴 무음을 이만큼(앞뒤 반씩)만 남긴다 */
export const KEEP_GAP_S = 0.3;
/** 자막 한 조각 최대 글자 수(세로 화면 14자 × 3줄 안쪽) */
export const CAPTION_CHARS = 36;
/** 영상 합치기 장면 수 한도(lib/edit/timeline.ts MAX_CLIPS와 같음) */
export const MAX_PIECES = 20;

const round = (v: number) => Math.round(v * 100) / 100;

/** 소리(모노)에서 무음 구간 찾기 — 50ms 창의 RMS가 dB 기준보다 작은 상태가 minS 이상 이어진 곳 */
export function findSilences(samples: Float32Array, rate: number, db = SILENCE_DB, minS = SILENCE_MIN_S): Silence[] {
  const win = Math.max(1, Math.round(rate * 0.05));
  const limit = Math.pow(10, db / 20);
  const out: Silence[] = [];
  let quietFrom = -1;
  const total = Math.ceil(samples.length / win);
  for (let w = 0; w < total; w++) {
    let sum = 0;
    const from = w * win, to = Math.min(samples.length, from + win);
    for (let i = from; i < to; i++) sum += samples[i] * samples[i];
    const quiet = Math.sqrt(sum / Math.max(1, to - from)) < limit;
    if (quiet && quietFrom < 0) quietFrom = w;
    if ((!quiet || w === total - 1) && quietFrom >= 0) {
      const endW = quiet ? w + 1 : w;
      const s = (quietFrom * win) / rate, e = Math.min(samples.length, endW * win) / rate;
      if (e - s >= minS) out.push([round(s), round(e)]);
      quietFrom = -1;
    }
  }
  return out;
}

const insideSilence = (t: number, silences: Silence[]) => silences.find(([s, e]) => t > s + 0.05 && t < e - 0.05);

/** 받아쓴 문장 정리: 빈 문장·무음 안의 문장·끝부분 아주 짧은 문장을 버리고, 무음 안에 걸친 경계는 무음 가장자리로 옮긴다 */
export function cleanSegments(segs: Seg[], silences: Silence[]): Seg[] {
  const out: Seg[] = [];
  for (const raw of segs) {
    const text = raw.text.replace(/\s+/g, " ").trim();
    if (!text || !(raw.end > raw.start)) continue;
    let { start, end } = raw;
    const sIn = insideSilence(start, silences);
    if (sIn) start = sIn[1];
    const eIn = insideSilence(end, silences);
    if (eIn) end = eIn[0];
    // 문장 전체가 무음 안에 있거나 0.5초도 안 남으면 받아쓰기가 지어낸 말로 본다
    if (end - start < 0.5) continue;
    out.push({ start: round(start), end: round(end), text });
  }
  return out;
}

const span = (segs: Seg[], a: number, b: number) => segs[b].end - segs[a].start;

/** AI가 고른 구간을 문장 범위 안으로 고치고 15~45초로 맞춘다(짧으면 뒤·앞 문장을 붙이고, 길면 뒤에서 뺀다) */
export function fixPick(p: Pick, segs: Seg[]): Pick | null {
  if (!segs.length) return null;
  const n = segs.length - 1;
  let a = Math.min(n, Math.max(0, Math.round(Number(p.first) || 0)));
  let b = Math.min(n, Math.max(0, Math.round(Number(p.last) || 0)));
  if (b < a) [a, b] = [b, a];
  while (span(segs, a, b) < MIN_CLIP_S && (b < n || a > 0)) {
    if (b < n) b++;
    else a--;
  }
  while (span(segs, a, b) > MAX_CLIP_S && b > a) b--;
  return { ...p, first: a, last: b, score: Math.min(100, Math.max(0, Math.round(Number(p.score) || 0))) };
}

/** AI 응답 JSON → 고친 구간 목록(점수 높은 순, 같은 범위 중복 제거, 최대 3개) */
export function parsePicks(raw: unknown, segs: Seg[]): Pick[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { clips?: unknown }).clips) ? (raw as { clips: unknown[] }).clips : [];
  const out: Pick[] = [];
  for (const c of list) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    const fixed = fixPick({
      first: Number(r.first), last: Number(r.last), score: Number(r.score),
      title: typeof r.title === "string" ? r.title.trim().slice(0, 30) : "",
      reason: typeof r.reason === "string" ? r.reason.trim().slice(0, 120) : "",
    }, segs);
    if (fixed && !out.some((o) => o.first === fixed.first && o.last === fixed.last)) out.push(fixed);
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 3);
}

/** 긴 문장을 띄어쓰기 기준 CAPTION_CHARS 안쪽 조각으로 */
export function splitCaption(text: string, max = CAPTION_CHARS): string[] {
  const words = text.split(" ").filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > max) { out.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.length ? out : [text];
}

/**
 * 고른 문장 범위 → 영상 합치기 장면 조각. 자막은 문장(길면 글자 비례로 나눔).
 * removeSilence: 문장 사이가 SILENCE_MIN_S보다 길면 KEEP_GAP_S만 남기고 건너뛴다. 끄면 원본 그대로 이어 붙인다.
 */
export function buildPieces(segs: Seg[], first: number, last: number, removeSilence: boolean): Piece[] {
  const out: Piece[] = [];
  let start = Math.max(0, segs[first].start - 0.1);
  for (let i = first; i <= last; i++) {
    const seg = segs[i];
    const next = i < last ? segs[i + 1] : null;
    const skip = !!next && removeSilence && next.start - seg.end > SILENCE_MIN_S;
    const end = !next ? seg.end + 0.3 : skip ? seg.end + KEEP_GAP_S / 2 : next.start;
    const parts = splitCaption(seg.text);
    const chars = parts.reduce((n, p) => n + p.length, 0);
    let t = start;
    parts.forEach((caption, k) => {
      const to = k === parts.length - 1 ? end : t + ((end - start) * caption.length) / chars;
      out.push({ start: round(t), end: round(to), caption });
      t = to;
    });
    // 건너뛴 무음 뒤 다음 문장은 그 문장 바로 앞(KEEP_GAP_S/2)부터
    if (next) start = skip ? next.start - KEEP_GAP_S / 2 : end;
  }
  return mergeToLimit(out);
}

/** 장면 수 한도를 넘으면, 이어진(사이에 건너뛴 무음이 없는) 가장 짧은 조각 둘을 합친다 */
function mergeToLimit(pieces: Piece[], max = MAX_PIECES): Piece[] {
  const out = [...pieces];
  while (out.length > max) {
    let best = -1, bestLen = Infinity;
    for (let i = 0; i < out.length - 1; i++) {
      const len = out[i + 1].end - out[i].start;
      if (Math.abs(out[i].end - out[i + 1].start) < 0.02 && len < bestLen) { best = i; bestLen = len; }
    }
    if (best < 0) break;
    out.splice(best, 2, { start: out[best].start, end: out[best + 1].end, caption: `${out[best].caption} ${out[best + 1].caption}`.trim() });
  }
  return out;
}

/** 완성 영상 길이(초) */
export const piecesSeconds = (pieces: Piece[]) => round(pieces.reduce((n, p) => n + (p.end - p.start), 0));

const srtTime = (t: number) => {
  const ms = Math.round(t * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** 완성 영상 기준 SRT(조각을 이어 붙인 시각) */
export function toSrt(pieces: Piece[]): string {
  let t = 0;
  const lines: string[] = [];
  let n = 0;
  for (const p of pieces) {
    const d = p.end - p.start;
    if (p.caption) lines.push(`${++n}`, `${srtTime(t)} --> ${srtTime(t + d)}`, p.caption, "");
    t += d;
  }
  return lines.join("\n");
}

/** 구간 고르기 프롬프트(이 프로그램 고유 문구) — 문장 번호로만 답하게 해 시각이 문장 경계에 맞게 한다 */
export function pickPrompt(segs: Seg[]): { system: string; prompt: string } {
  const list = segs.map((s, i) => `${i}\t${s.start.toFixed(1)}-${s.end.toFixed(1)}\t${s.text}`).join("\n");
  return {
    system: "당신은 한국어 긴 영상에서 쇼츠로 쓸 구간을 고르는 편집자입니다. 받아쓴 문장 목록만 근거로 고르고, 없는 내용을 지어내지 않습니다.",
    prompt: `아래는 영상의 받아쓴 문장 목록입니다(번호\\t시작-끝(초)\\t문장).
${list}

쇼츠로 쓸 만한 구간을 1~3개 고르세요. 규칙:
- 각 구간은 연속된 문장 묶음이며 ${MIN_CLIP_S}~${MAX_CLIP_S}초.
- 혼잣말·준비 멘트(조명·잠깐만요 등)·인사만 있는 부분은 빼세요.
- 점수(0~100)는 첫 3초 후킹·정보 밀도·혼자 봐도 이해되는지 기준.
JSON만 출력: {"clips":[{"first":문장번호,"last":문장번호,"score":0,"title":"20자 이내","reason":"한 문장"}]}`,
  };
}

/** 16비트 모노 WAV 만들기(받아쓰기로 보낼 소리) */
export function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}
