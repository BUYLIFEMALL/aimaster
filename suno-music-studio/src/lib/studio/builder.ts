import {
  DEFAULT_BRIEF,
  type Brief,
  type Draft,
  type Track,
  type Store,
} from "./config";
import { automaticExclude, syncStyleControls } from "./catalog";
import { albumBrief, arrangeTracks } from "./workflows";
import { mergeBackup } from "./storage";

export function emptyBuilderTrack(brief: Brief): Track {
  return {
    id: "",
    title: "",
    summary: brief.concept.slice(0, 700),
    style: brief.style,
    exclude: automaticExclude(brief),
    lyrics: "",
    bpm: brief.bpm,
    hook: "",
    reviewed: false,
  };
}
export function lyricSkeleton(brief: Brief): string {
  if (brief.instrumental) return "";
  if (brief.rapPct === 100)
    return "[Intro]\n\n[Rap Verse]\n\n[Rapped Hook]\n\n[Rap Verse]\n\n[Rapped Hook]\n\n[Rap Break]\n\n[Outro]";
  const structures: Record<string, string[]> = {
    표준: [
      "Intro",
      "Verse 1",
      "Pre-Chorus",
      "Chorus",
      "Verse 2",
      "Pre-Chorus",
      "Chorus",
      "Bridge",
      "Chorus",
      "Outro",
    ],
    "후렴 선행": [
      "Chorus",
      "Verse 1",
      "Pre-Chorus",
      "Chorus",
      "Verse 2",
      "Bridge",
      "Chorus",
      "Outro",
    ],
    "점층 전개": [
      "Intro",
      "Verse 1",
      "Verse 2",
      "Pre-Chorus",
      "Chorus",
      "Bridge",
      "Chorus",
      "Outro",
    ],
    "댄스 드롭": [
      "Intro",
      "Verse 1",
      "Buildup",
      "Drop",
      "Verse 2",
      "Buildup",
      "Drop",
      "Outro",
    ],
    "자유 전개": ["Intro", "Verse 1", "Interlude", "Verse 2", "Outro"],
  };
  return (structures[brief.structure] || structures["표준"])
    .map((t) => "[" + t + "]")
    .join("\n\n");
}
export function insertSkeleton(track: Track, brief: Brief): Track {
  if (brief.instrumental)
    throw new Error("연주곡은 가사 골격을 넣지 않습니다.");
  if (track.lyrics.trim())
    throw new Error(
      "작성된 가사는 보존합니다. 가사를 비운 뒤 골격을 넣어 주세요.",
    );
  return { ...track, lyrics: lyricSkeleton(brief), reviewed: false };
}
export function resetBuilder(draft: Draft): Draft {
  return {
    ...draft,
    song: null,
    brief: {
      ...structuredClone(DEFAULT_BRIEF),
      provider: draft.brief.provider,
      model: draft.brief.model,
      customModel: draft.brief.customModel,
      concept: "",
      intent: "",
      style: "",
    },
  };
}
export function applyBuilderControls(draft: Draft): Draft {
  const brief = syncStyleControls(draft.brief, draft.brief, true);
  const style = arrangeTracks(
    [{ ...(draft.song || emptyBuilderTrack(brief)), style: brief.style }],
    brief,
  )[0].style;
  const applied = { ...brief, style };
  return {
    ...draft,
    brief: applied,
    song: draft.song
      ? {
          ...draft.song,
          style,
          bpm: brief.bpm,
          exclude: automaticExclude(brief),
          reviewed: false,
        }
      : null,
  };
}
export function importAlbumBackup(current: Store, raw: unknown): Store {
  const merged = mergeBackup(current, raw);
  if (!merged.draft.album)
    throw new Error("앨범이 포함된 AIMaster JSON 백업을 선택해 주세요.");
  return {
    ...merged,
    draft: {
      ...current.draft,
      album: merged.draft.album,
      albumBrief: structuredClone(albumBrief(merged.draft)),
    },
  };
}
export function moveAlbumTrack(
  tracks: Track[],
  id: string,
  offset: number,
): Track[] {
  const index = tracks.findIndex((t) => t.id === id),
    target = index + offset;
  if (
    index < 0 ||
    target < 0 ||
    target >= tracks.length ||
    ![-1, 1].includes(offset)
  )
    return tracks;
  const next = [...tracks];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
