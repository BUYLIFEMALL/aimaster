import { type Brief, type Track } from "./config";
import { automaticExclude } from "./catalog";
import { AppError } from "./validation";
export function generationTargets(b: Brief) {
  return {
    title: b.generateTitle,
    style: b.generateStyle,
    lyrics: b.generateLyrics,
  };
}
export function assertTargets(b: Brief) {
  if (
    !b.generateTitle &&
    !b.generateStyle &&
    (!b.generateLyrics || b.instrumental)
  )
    throw new AppError(
      "생성할 항목을 하나 이상 선택해 주세요. 연주곡은 제목 또는 Style을 선택하세요.",
    );
}
export function mergeSong(
  previous: Track | null,
  generated: Track,
  b: Brief,
): Track {
  const old = previous ?? {
    id: generated.id,
    title: "",
    summary: "",
    style: b.style,
    exclude: automaticExclude(b),
    lyrics: "",
    bpm: b.bpm,
    hook: "",
    reviewed: false,
  };
  return {
    ...old,
    title: b.generateTitle ? generated.title : old.title,
    style: b.generateStyle ? generated.style : old.style,
    exclude: b.generateStyle ? generated.exclude : old.exclude,
    bpm: b.generateStyle ? generated.bpm : old.bpm,
    lyrics: b.generateLyrics
      ? b.instrumental
        ? ""
        : generated.lyrics
      : old.lyrics,
    hook: b.generateLyrics ? generated.hook : old.hook,
    summary: !previous || b.generateLyrics ? generated.summary : old.summary,
    reviewed: false,
  };
}
