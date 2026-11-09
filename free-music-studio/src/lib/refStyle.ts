// 참고곡 → 「음악 스타일」 칸(백로그 D-9) — 규칙·응답 해석(순수 함수, 시험 tests/refStyle.test.mjs).
// 리버스 프롬프트·AI 오디오 분석은 Suno용 문구라 그대로 쓰지 않고, ACE-Step 태그로만 받는다.
// AI 오디오 분석의 알려진 결함(연주곡에서 가사·보컬을 지어냄)을 막으려고: 가사 받아 적기 금지, 보컬이 확실할 때만 보컬 태그, 확실하지 않은 것은 뺀다.
import { LIMITS } from "@/lib/songs";

export type RefStyle = { style: string; bpm: number | null; hasVocals: boolean };

export function refStyleRules(instrumental: boolean): string {
  return [
    "You are a music producer. Listen to the attached audio excerpt (a reference track the user owns or likes) and describe its musical STYLE so a different, original song can be made in a similar style with the AI music model ACE-Step 1.5.",
    'Respond only with a JSON object {"style":"...","bpm":120,"has_vocals":true}.',
    `style: English comma-separated tags ACE-Step understands, at most ${LIMITS.style} characters: genre and subgenre, mood, tempo as "<n> BPM", key/mode only if clearly audible, lead and supporting instruments, production texture, and ${instrumental ? 'start with the tag "instrumental" and do not describe any vocals (the user wants an instrumental track)' : "vocal type and delivery only if a human voice is clearly audible"}.`,
    "Never write lyrics, transcribed words, song titles, artist or band names, or label names. Never claim vocals when none are clearly audible; synthesized pads or effects are not vocals.",
    "If something is uncertain, leave it out instead of guessing.",
    "bpm: your best integer estimate of the tempo, or null if unclear. has_vocals: true only if a human singing or rapping voice is clearly audible.",
  ].join("\n");
}

/** AI 응답 → 스타일 글. 형식이 틀리면 던진다. 연주곡이면 맨 앞에 instrumental을 보장하고, 길이는 한도 안으로 */
export function parseRefStyle(raw: string, instrumental: boolean): RefStyle {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI 응답을 읽지 못했습니다.");
  let j: { style?: unknown; bpm?: unknown; has_vocals?: unknown };
  try {
    j = JSON.parse(m[0]);
  } catch {
    throw new Error("AI 응답을 읽지 못했습니다.");
  }
  let style = typeof j.style === "string" ? j.style.replace(/\s+/g, " ").trim() : "";
  if (!style) throw new Error("스타일을 받지 못했습니다.");
  if (instrumental && !/^instrumental\b/i.test(style)) style = `instrumental, ${style}`;
  if (style.length > LIMITS.style) {
    // 태그 단위로 뒤에서부터 줄인다
    const tags = style.split(",").map((t) => t.trim()).filter(Boolean);
    while (tags.length > 1 && tags.join(", ").length > LIMITS.style) tags.pop();
    style = tags.join(", ").slice(0, LIMITS.style);
  }
  const bpm = typeof j.bpm === "number" && Number.isFinite(j.bpm) && j.bpm >= 40 && j.bpm <= 240 ? Math.round(j.bpm) : null;
  return { style, bpm, hasVocals: j.has_vocals === true && !instrumental };
}
