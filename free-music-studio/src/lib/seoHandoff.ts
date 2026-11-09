// 곡 → 유튜브 제목·설명·태그·썸네일(백로그 D-7, 2026-11-09 주인님 「그다음 이거 진행해」).
// AI 썸네일·SEO 자동화(thumbnail-master) 「SEO 전략」 화면이 이미 주소 # 뒤 대본을 받는다(쇼츠 원스톱이 쓰는 통로).
// 형식은 thumbnail-master/src/lib/reference.ts refHandoffHash(공용 reference-copy-guard)와 같게 — #ref-transcript=<글>&ref-from=<보낸 곳>.
// 주소 # 뒤라 서버로 보내지 않는다. 음원이 필요 없어 곡이 없는 PC에서도 된다.
import { isInstrumentalLyrics } from "@/lib/lyricRules";
import { isSfxLyrics } from "@/lib/songs";

export const THUMBNAIL_SEO_URL = "https://thumbnail-master.buylife.xyz/seo";
/** 받는 쪽 상한(REF_HANDOFF_MAX)과 같게 */
export const SEO_TEXT_MAX = 12000;
const FROM = "AI 무료음악 자동화";

type SongInfo = { title: string; style_prompt: string; lyrics: string; duration_sec: number };

const lengthLabel = (s: number) => (s < 60 ? `${s}초` : s % 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s / 60}분`);

/** SEO 전략 화면 「대본」 칸에 넣을 글 — 곡 소개 + 스타일 + 가사(연주곡·효과음이면 가사 없음) */
export function songSeoText(t: SongInfo): string {
  const lyrics = (t.lyrics ?? "").trim();
  const kind = isSfxLyrics(lyrics) ? "효과음" : !lyrics || isInstrumentalLyrics(lyrics) ? "연주곡(보컬 없음)" : "노래(보컬곡)";
  const lines = [
    "AI로 만든 음악을 유튜브에 올리려고 합니다. 이 곡에 맞는 유튜브 제목·설명·태그를 만들어 주세요.",
    `곡 제목: ${t.title.trim() || "제목 없음"}`,
    `곡 종류: ${kind} · 길이 ${lengthLabel(Math.max(0, Math.round(t.duration_sec || 0)))}`,
    t.style_prompt.trim() ? `음악 스타일: ${t.style_prompt.trim()}` : "",
    kind === "노래(보컬곡)" ? `가사:\n${lyrics}` : "",
  ].filter(Boolean);
  return lines.join("\n").slice(0, SEO_TEXT_MAX);
}

/** SEO 전략 화면으로 바로 가는 주소 */
export function seoHandoffUrl(t: SongInfo): string {
  return `${THUMBNAIL_SEO_URL}#ref-transcript=${encodeURIComponent(songSeoText(t))}&ref-from=${encodeURIComponent(FROM)}`;
}
