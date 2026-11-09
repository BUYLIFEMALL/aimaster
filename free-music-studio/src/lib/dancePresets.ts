// 댄스·월드 장르 프리셋 200개(백로그 D-8, 2026-11-09 주인님 「200개 전부 + 계열 필터」).
// 출처: 같은 저장소 음악(SUNO) 자동화 `music/lib/studio/dance-metadata.json`(장르 이름·영어 이름·계열·BPM)을 사본으로 옮김(프로그램끼리 서로 불러오지 않음).
// 원본의 스타일 문구는 Suno용이라 쓰지 않고, ACE-Step 태그(장르 · 계열 악기·분위기 · 대표 BPM)로 새로 만든다. 가수 이름 없음.
// 일반 프리셋(presets.ts)과 따로 둔다 — 연주곡 프리셋 분류가 연주곡 장르 목록(여러 버전·장르 칩)으로도 쓰이기 때문(섞으면 장르가 11개 늘어남).
import genres from "./danceGenres.json";
import type { Preset, PresetMode } from "./presets";

type DanceGenre = { id: string; name: string; en: string; family: string; bpms: number[] };

/** 분류 이름 앞머리 — 이 앞머리로 시작하면 댄스·월드 프리셋(장르 칩과 연결하지 않음) */
export const DANCE_CATEGORY_PREFIX = "댄스·월드 · ";

/** 계열 → 한국어 이름·ACE-Step 태그(악기·질감·분위기) */
export const DANCE_FAMILIES: Record<string, { label: string; tags: string }> = {
  house: { label: "하우스", tags: "four-on-the-floor kick, warm chord stabs, groovy bassline, club energy" },
  techno: { label: "테크노", tags: "driving kick, hypnotic synth sequences, crisp hi-hats, dark warehouse mood" },
  trance: { label: "트랜스", tags: "euphoric supersaw leads, rolling arpeggios, big breakdown and build-up" },
  dnb: { label: "드럼앤베이스", tags: "fast breakbeats, deep sub bass, rolling drums, high energy" },
  hard: { label: "하드 댄스", tags: "distorted kick, aggressive synth leads, intense hard-hitting drops" },
  bass: { label: "베이스 뮤직", tags: "heavy wobble bass, punchy drums, sub drops, hard-hitting" },
  disco: { label: "디스코·펑크", tags: "funky bass guitar, four-on-the-floor drums, lush strings, groovy" },
  latin: { label: "라틴", tags: "latin percussion, syncopated rhythm, brass stabs, festive dance groove" },
  afro: { label: "아프로", tags: "afro percussion, log drums, warm groove, rhythmic chants" },
  experimental: { label: "실험적", tags: "broken beats, glitchy textures, unusual sound design, atmospheric" },
  modern: { label: "모던 일렉트로닉", tags: "modern electronic production, crisp drums, catchy synth hooks" },
};

/** 대표 BPM — 범위의 가운데(정수) */
export function danceBpm(bpms: number[]): number {
  if (!bpms.length) return 120;
  return Math.round((Math.min(...bpms) + Math.max(...bpms)) / 2);
}

/** 영어 이름을 태그로 — 소문자, 악센트·비 ASCII 제거 */
export function danceTag(en: string): string {
  return en
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const LIST = genres as DanceGenre[];

/** 이 모드(노래·연주곡)의 댄스·월드 프리셋 200개 — 노래는 보컬 태그, 연주곡은 instrumental */
export function dancePresetsFor(mode: PresetMode): Preset[] {
  return LIST.map((g) => {
    const fam = DANCE_FAMILIES[g.family] ?? { label: g.family, tags: "electronic dance production" };
    const bpm = danceBpm(g.bpms);
    const range = g.bpms.length > 1 ? `${Math.min(...g.bpms)}~${Math.max(...g.bpms)} BPM` : `${bpm} BPM`;
    const genre = danceTag(g.en);
    const prompt =
      mode === "instrumental"
        ? `Instrumental ${genre}, ${fam.tags}, ${bpm} BPM`
        : `${genre[0].toUpperCase()}${genre.slice(1)} song, lead vocals, ${fam.tags}, ${bpm} BPM`;
    return {
      id: `${g.id}-${mode === "instrumental" ? "i" : "v"}`,
      name: `${g.name} · ${g.en}`,
      category: `${DANCE_CATEGORY_PREFIX}${fam.label}`,
      description: range,
      prompt,
      mode,
    };
  });
}

export const isDanceCategory = (category: string) => category.startsWith(DANCE_CATEGORY_PREFIX);
