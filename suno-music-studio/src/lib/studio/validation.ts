import {
  ARRANGEMENTS,
  ARCS,
  VOICES,
  STRUCTURES,
  MODELS,
  isProvider,
  type Brief,
  type Track,
  type Draft,
  type Album,
  type Store,
} from "./config";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new AppError("자료 형식이 올바르지 않습니다.");
  return v as Record<string, unknown>;
}
export function text(
  v: unknown,
  label: string,
  max: number,
  optional = false,
): string {
  if (typeof v !== "string" || (!optional && !v.trim()) || v.length > max)
    throw new AppError(
      `${label}: ${max}자 이내의 ${optional ? "" : "비어 있지 않은 "}문자열이 필요합니다.`,
    );
  return v.trim();
}
function number(v: unknown, label: string, min: number, max: number): number {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    !Number.isInteger(v) ||
    v < min ||
    v > max
  )
    throw new AppError(`${label}: ${min}~${max} 범위의 정수가 필요합니다.`);
  return v;
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean")
    throw new AppError("선택 값이 올바르지 않습니다.");
  return v;
}
export function styleIssues(style: string): string[] {
  const out: string[] = [];
  if (!style.trim()) out.push("Style을 입력해 주세요.");
  if (style.length > 1000) out.push("Style은 1,000자 이내로 정리해 주세요.");
  if (/[^\x20-\x7E\r\n\t]/.test(style))
    out.push("Style은 영문 음악 용어로 작성해 주세요.");
  if (/\b(?:style of|sound like|inspired by|imitate)\b/i.test(style))
    out.push("특정 아티스트 모방 표현을 음악 속성으로 바꿔 주세요.");
  return out;
}
export function validateBrief(raw: unknown, requireConcept = true): Brief {
  const b = record(raw);
  if (
    !isProvider(b.provider) ||
    !MODELS.some((m) => m.id === b.model && m.provider === b.provider)
  )
    throw new AppError("공급사와 모델 선택이 올바르지 않습니다.");
  if (
    !ARCS.some((v) => v === b.arc) ||
    !VOICES.some((v) => v === b.voice) ||
    !STRUCTURES.some((v) => v === b.structure) ||
    !ARRANGEMENTS.some((v) => v === b.arrangement)
  )
    throw new AppError("앨범 흐름·보컬·구조를 확인해 주세요.");
  const result: Brief = {
    harmony: bool(b.harmony),
    callResponse: bool(b.callResponse),
    arrangement: String(b.arrangement),
    concept: text(b.concept, "곡/앨범 설명", 1500, !requireConcept),
    intent: text(b.intent, "상세 의도", 1500, true),
    genre: text(b.genre, "장르", 180, !requireConcept),
    mood: text(b.mood, "분위기", 180, !requireConcept),
    instruments: text(b.instruments, "악기", 350, !requireConcept),
    bpm: number(b.bpm, "BPM", 40, 220),
    voice: String(b.voice),
    englishPct: number(b.englishPct, "영문 비율", 0, 100),
    rapPct: number(b.rapPct, "랩 비율", 0, 100),
    metaphorPct: number(b.metaphorPct, "비유 강도", 0, 100),
    instrumental: bool(b.instrumental),
    cues: bool(b.cues),
    structure: String(b.structure),
    locked: bool(b.locked),
    style: text(b.style, "고정 Style", 1000, true),
    exclude: text(b.exclude, "제외 스타일", 500, true),
    arc: String(b.arc),
    count: number(b.count, "앨범 곡 수", 3, 12),
    model: String(b.model),
    provider: b.provider,
  };
  if (result.locked && requireConcept && styleIssues(result.style).length)
    throw new AppError(styleIssues(result.style).join(" "));
  return result;
}
export function validateTrack(
  raw: unknown,
  requireLyrics = false,
  draft = false,
): Track {
  const t = record(raw);
  const style = text(t.style, "Style", 1000, draft);
  if (!draft && styleIssues(style).length)
    throw new AppError(styleIssues(style).join(" "));
  return {
    id: text(t.id ?? "generated", "곡 ID", 100),
    title: text(t.title, "제목", 80, draft),
    summary: text(t.summary, "설명", 700, draft),
    style,
    exclude: text(t.exclude ?? "", "제외 스타일", 500, true),
    lyrics: text(t.lyrics ?? "", "가사", 5000, !requireLyrics),
    bpm: number(t.bpm, "곡 BPM", 40, 220),
    hook: text(t.hook ?? "", "핵심 구절", 250, true),
    reviewed: t.reviewed === true,
  };
}
export function parseGenerated(
  raw: string,
  expected: number,
  requireLyrics: boolean,
): Album {
  let r: Record<string, unknown>;
  try {
    r = record(
      JSON.parse(
        raw
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, ""),
      ),
    );
  } catch {
    throw new AppError(
      "AI 결과의 JSON 형식을 읽지 못했습니다. 기존 결과는 유지됩니다.",
      502,
    );
  }
  if (!Array.isArray(r.tracks) || r.tracks.length !== expected)
    throw new AppError(
      `AI가 ${expected}곡 형식을 완성하지 못했습니다. 기존 결과는 유지됩니다.`,
      502,
    );
  const tracks = r.tracks.map((t, i) => ({
    ...validateTrack(t, requireLyrics),
    id: `generated-${i + 1}`,
    reviewed: false,
  }));
  if (new Set(tracks.map((t) => t.title.toLowerCase())).size !== tracks.length)
    throw new AppError("AI 결과의 곡 제목이 중복됩니다.", 502);
  return {
    title: text(r.title, "기획 제목", 100),
    summary: text(r.summary, "기획 설명", 1000),
    tracks,
  };
}
function validateDraft(raw: unknown): Draft {
  const d = record(raw);
  const brief = validateBrief(d.brief, false);
  let album: Album | null = null;
  if (d.album !== null) {
    const a = record(d.album);
    if (!Array.isArray(a.tracks) || a.tracks.length < 3 || a.tracks.length > 12)
      throw new AppError("앨범에는 3~12곡이 필요합니다.");
    const tracks = a.tracks.map((t) => validateTrack(t, false, true));
    if (new Set(tracks.map((t) => t.id)).size !== tracks.length)
      throw new AppError("곡 ID가 중복됩니다.");
    album = {
      title: text(a.title, "앨범명", 100),
      summary: text(a.summary, "앨범 설명", 1000),
      tracks,
    };
  }
  return {
    brief,
    song: d.song === null ? null : validateTrack(d.song, false, true),
    album,
  };
}
export function validateStore(raw: unknown): Store {
  const s = record(raw);
  if (s.schema !== 1 || !Array.isArray(s.saved) || s.saved.length > 100)
    throw new AppError("지원하지 않는 백업 형식입니다.");
  const saved = s.saved.map((v) => {
    const i = record(v);
    return {
      id: text(i.id, "저장 ID", 100),
      name: text(i.name, "저장 이름", 100),
      savedAt: text(i.savedAt, "저장 일시", 50),
      draft: validateDraft(i.draft),
    };
  });
  if (new Set(saved.map((i) => i.id)).size !== saved.length)
    throw new AppError("저장 ID가 중복됩니다.");
  return { schema: 1, draft: validateDraft(s.draft), saved };
}
