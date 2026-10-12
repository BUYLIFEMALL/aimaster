// 프롬프트 생성 — 모든 결과는 JSON으로 받는다. 연도(당해 연도)·한국인 묘사 기본 규칙을 항상 넣는다.
import { LIMITS, METAPHORS, genreName, langName, resolveStructure, thumbStyleById, type LyricsOptions } from "./types";

export interface Prompt { system: string; user: string }

const yearRule = (year: number) =>
  `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기, 트렌드, 제목은 반드시 ${year}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.]`;

const JSON_ONLY = "Respond with a single valid JSON value only. No markdown fences, no commentary.";

const BASE_SYSTEM = (year: number) =>
  `You are a veteran YouTube music-playlist channel producer and songwriter. ${yearRule(year)} ${JSON_ONLY}`;

export function titlesPrompt(genre: string, year: number): Prompt {
  return {
    system: BASE_SYSTEM(year),
    user: `Genre: ${genreName(genre)}

Create exactly ${LIMITS.titleCount} distinct YouTube playlist titles for this genre.
STRICT format for every title (one line):
playlist [one Emoji] [one natural Korean sentence expressing a mood or situation] | [English Keyword 1] & [English Keyword 2]

Rules:
- Start with the lowercase word "playlist", then a space, then exactly one emoji.
- The Korean sentence must feel like a real channel title (listening situation, time of day, feeling), not a generic label.
- Each title must use a different mood/situation and different emoji.
- English keywords are short (1-2 words each) and search-friendly.

Return JSON: { "titles": ["...", "..."] }`,
  };
}

export function sunoPrompt(genre: string, title: string, year: number): Prompt {
  return {
    system: BASE_SYSTEM(year),
    user: `Genre: ${genreName(genre)}
Playlist title: ${title}

Write 3 different "Suno 5.0 style prompts" (the Style of Music field) for songs that fit this playlist.
Each prompt:
- English only, comma-separated descriptors: genre/sub-genre, mood, tempo (BPM), key instruments, vocal type and texture, production/mixing notes, era feel.
- Under ${LIMITS.sunoMaxChars - 100} characters (hard limit ${LIMITS.sunoMaxChars}).
- The 3 variants must differ clearly (e.g. different tempo, vocal character or instrumentation), but all fit the playlist mood.
- Do not mention real artist names.

Return JSON: { "variants": [ { "name": "short Korean label", "style": "the prompt", "note": "one Korean sentence on how this variant feels" } ] }`,
  };
}

/** 곡 제목·주제 목록을 먼저 뽑는다(병렬 배치 때 곡이 겹치지 않게) */
export function songPlanPrompt(genre: string, title: string, opts: LyricsOptions, year: number): Prompt {
  return {
    system: BASE_SYSTEM(year),
    user: `Genre: ${genreName(genre)}
Playlist title: ${title}
${opts.theme ? `Theme memo from the channel owner: ${opts.theme}\n` : ""}Song title language: ${langName(opts.language)}${opts.secondLanguage ? ` (a few titles may use ${langName(opts.secondLanguage)})` : ""}

Plan exactly ${opts.songCount} different songs for this playlist. Each song has a title and a one-sentence concept (a distinct scene or feeling; no two songs share the same concept).

Return JSON: { "songs": [ { "title": "...", "concept": "..." } ] }`,
  };
}

const NO_REAL_PEOPLE = "Do not quote existing copyrighted lyrics. Do not mention real people or brands.";

export function lyricsPrompt(
  genre: string,
  title: string,
  opts: LyricsOptions,
  songs: { no: number; title: string; concept: string }[],
  year: number,
): Prompt {
  const structure = resolveStructure(opts.structure, genre);
  let sections = [...structure.sections];
  if (opts.intro && !/intro/i.test(sections[0])) sections = ["Intro", ...sections];
  if (opts.outro && !/outro/i.test(sections[sections.length - 1])) sections = [...sections, "Outro"];
  const metaphor = METAPHORS.find((m) => m.level === opts.metaphor)!;
  const dual = opts.secondLanguage
    ? `Write in a bilingual mix: about ${100 - opts.secondRatio}% ${langName(opts.language)} and ${opts.secondRatio}% ${langName(opts.secondLanguage)}. Mix them naturally inside the sections (for example hook lines or chorus endings in the second language).`
    : `Write only in ${langName(opts.language)}.`;

  const list = songs.map((s) => `${s.no}. "${s.title}" — ${s.concept}`).join("\n");
  return {
    system: BASE_SYSTEM(year),
    user: `Genre: ${genreName(genre)}
Playlist title: ${title}
${opts.theme ? `Theme memo: ${opts.theme}\n` : ""}
Write full song lyrics for the following songs (keep each song's number and title exactly):
${list}

Language: ${dual}
Metaphor level ${opts.metaphor}/4 — ${metaphor.label}: ${metaphor.hint}.
Song structure to follow in this exact order: ${sections.join(" → ")}.
${opts.instrumental
      ? `INSTRUMENTAL MODE: do not write sung lyrics. For each section write one short bracketed direction in English (instrumentation, dynamics, mood) so a music AI can build the arrangement. The "lyrics" field uses lines like "[Section Name]" followed by a one-line direction.`
      : `Format "lyrics" as plain text: each section starts with its tag on its own line like [Verse 1], followed by the lines. ${opts.intro ? "The Intro section has short sung lines." : "Intro (if present) is instrumental: give a one-line bracketed direction only."} ${opts.outro ? "The Outro section has short sung lines." : "Outro (if present) is instrumental: give a one-line bracketed direction only."} Keep each section singable (4-8 lines for verses and choruses). The chorus must be memorable and repeat consistently.`}
${NO_REAL_PEOPLE}

Return JSON: { "songs": [ { "no": 1, "title": "...", "lyrics": "..." } ] }`,
  };
}

export function metaPrompt(genre: string, title: string, firstSongs: string[], year: number): Prompt {
  return {
    system: BASE_SYSTEM(year),
    user: `Genre: ${genreName(genre)}
Playlist title: ${title}
${firstSongs.length ? `Tracks: ${firstSongs.join(" / ")}\n` : ""}
Create YouTube upload metadata for this playlist video.
- description: Korean, 6-10 lines, friendly channel tone: a hook line, when/where to listen, mood, a short note on the playlist, a gentle subscribe line. Do not invent timestamps. Plain text with line breaks.
- hashtags: exactly ${LIMITS.hashtags} hashtags; the FIRST must be #playlist; the rest relevant to the genre and mood (mix Korean and English).
- keywords: exactly ${LIMITS.keywords} search keywords (Korean and English mix, no #).

Return JSON: { "description": "...", "hashtags": ["#playlist", "..."], "keywords": ["..."] }`,
  };
}

/** 썸네일 이미지 프롬프트. 글자는 이미지에 넣지 않고 화면에서 따로 얹는다. */
export function thumbnailPrompt(
  genre: string,
  title: string,
  styleId: string,
  opts: { hasPersona: boolean; feedback?: string; year: number },
): string {
  const style = thumbStyleById(styleId);
  const lines = [
    `Create a 16:9 YouTube thumbnail background image for a music playlist.`,
    `Genre: ${genreName(genre)}. Playlist concept: ${title}.`,
    `Visual style: ${style.prompt}.`,
    `Composition: a single clear focal subject, strong mood, high contrast, leave clean empty space ${"in the lower third"} for a title overlay.`,
    `ABSOLUTELY NO text, letters, numbers, logos, watermarks or captions anywhere in the image.`,
    `If a person appears, depict them with natural Korean (East Asian) appearance unless the concept clearly requires otherwise.`,
    `Current year context: ${opts.year}; modern, up-to-date look.`,
  ];
  if (opts.hasPersona) lines.push(`Use the attached reference image as the character/persona: keep the same face, hairstyle and overall identity, placed naturally in the scene.`);
  if (opts.feedback?.trim()) lines.push(`Revision request from the user (apply it): ${opts.feedback.trim().slice(0, 300)}`);
  return lines.join("\n");
}
