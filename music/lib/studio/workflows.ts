import {
  DEFAULT_BRIEF,
  VOICE_TERMS,
  type Brief,
  type Draft,
  type Track,
} from "./config";
import { automaticExclude, joinTags, syncStyleControls } from "./catalog";
export const ALBUM_MOODS = [
  ["멜랑콜리", "melancholic"],
  ["희망적", "hopeful"],
  ["정열", "passionate"],
  ["차가움", "cold"],
  ["따뜻함", "warm"],
  ["슬픔", "sad"],
  ["분노", "angry"],
  ["노스탤지어", "nostalgic"],
  ["에너지", "energetic"],
  ["고요", "serene"],
  ["환상적", "dreamy"],
  ["드라마틱", "dramatic"],
  ["흥겨움", "joyful"],
  ["평온", "peaceful"],
  ["이별", "heartbroken"],
] as const;
export const ARRANGEMENT_TERMS: Record<string, string[]> = {
  자동: [],
  "팝 코러스": ["layered pop harmonies"],
  "콜 앤 리스폰스": ["call and response"],
  "라이브 밴드": ["live band arrangement"],
  가스펠: ["gospel choir"],
  "EDM 드롭": ["electronic buildup", "instrumental drop"],
  "아이돌 응원 코러스": ["group backing vocals", "crowd response"],
  "스타디움 록": ["arena rock guitars", "stadium backing vocals"],
  "애니메이션 주제가": ["dramatic orchestral pop", "uplifting backing vocals"],
  "펑크 갱 보컬": ["punk guitar rhythm", "gang backing vocals"],
};
export function albumBrief(draft: Draft): Brief {
  return draft.albumBrief || draft.brief;
}
export function importBuilderSettings(draft: Draft): Brief {
  const album = albumBrief(draft);
  return {
    ...draft.brief,
    concept: album.concept,
    intent: album.intent,
    count: album.count,
    arc: album.arc,
  };
}
export function trackBrief(brief: Brief, track: Track): Brief {
  return {
    ...brief,
    voice: track.voice || brief.voice,
    rapVoice: track.rapVoice || brief.rapVoice,
    differentRapVoice: track.rapVoice ? true : brief.differentRapVoice,
  };
}
export function castTrack(
  brief: Brief,
  track: Track,
  voice: string,
  rapVoice: string,
): Track {
  const previous = {
    ...trackBrief(brief, track),
    style: track.style,
    bpm: track.bpm,
  };
  const next = {
    ...brief,
    style: track.style,
    bpm: track.bpm,
    voice: voice || brief.voice,
    rapVoice: rapVoice || brief.rapVoice,
    differentRapVoice: rapVoice ? true : brief.differentRapVoice,
  };
  return {
    ...track,
    voice,
    rapVoice,
    style: syncStyleControls(previous, next).style,
    reviewed: false,
  };
}
export function updateAlbumTracks(
  tracks: Track[],
  previous: Brief,
  next: Brief,
): Track[] {
  const obsolete = new Set(
    automaticExclude({ ...previous, exclude: "" })
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
  return tracks.map((track) => {
    const old = {
      ...trackBrief(previous, track),
      bpm: track.bpm,
      style: track.style,
    };
    const current = {
      ...trackBrief(next, track),
      bpm: track.bpm,
      style: track.style,
    };
    const manual = track.exclude
      .split(",")
      .map((t) => t.trim())
      .filter((t) => !obsolete.has(t.toLowerCase()))
      .join(", ");
    const exclude = automaticExclude({
      ...current,
      exclude: joinTags(manual, [next.exclude]),
    });
    const style = syncStyleControls(old, current).style;
    if (exclude.length > 500)
      throw new Error("제외 스타일은 500자 이내로 정리해 주세요.");
    return { ...track, style, exclude, reviewed: false };
  });
}
export function arrangeTracks(tracks: Track[], brief: Brief): Track[] {
  const terms = ARRANGEMENT_TERMS[brief.arrangement] || [];
  return tracks.map((track) => {
    // Instrumental/pure rap must not receive sung backing voices.
    const safe = terms.filter(
      (t) =>
        !(brief.instrumental || brief.rapPct === 100) ||
        !/vocal|harmon|choir|response/i.test(t),
    );
    const style = joinTags(track.style, safe);
    if (style.length > 1000)
      throw new Error(
        "전체 편곡 적용 후 Style이 1,000자를 초과합니다. 해당 곡의 태그를 정리해 주세요.",
      );
    return {
      ...track,
      style,
      reviewed: style === track.style ? track.reviewed : false,
    };
  });
}
export function emptyAlbumSettings(brief: Brief): Brief {
  return {
    ...DEFAULT_BRIEF,
    count: 12,
    provider: brief.provider,
    model: brief.model,
    customModel: brief.customModel,
  };
}
export function voiceSummary(track: Track, brief: Brief) {
  const b = trackBrief(brief, track);
  return VOICE_TERMS[b.voice];
}
export function composeDance(seed: string, picked: string[]) {
  const pickedTempo = picked.findLast((t) => /^\d{2,3}\s*bpm$/i.test(t));
  const parts = seed
    .split(",")
    .map((t) => t.trim())
    .filter((t) => !pickedTempo || !/^\d{2,3}\s*bpm$/i.test(t));
  const tags = picked.filter(
    (t) => !/^\d{2,3}\s*bpm$/i.test(t) || t === pickedTempo,
  );
  const style = joinTags(parts.join(", "), tags);
  const tempo = style
    .split(",")
    .map((t) => t.trim())
    .findLast((t) => /^\d{2,3}\s*bpm$/i.test(t));
  return { style, bpm: tempo ? Number.parseInt(tempo) : undefined };
}
