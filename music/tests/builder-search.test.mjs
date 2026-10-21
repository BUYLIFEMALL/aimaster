import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BRIEF } from "../lib/studio/config.ts";
import { blankStore } from "../lib/studio/storage.ts";
import {
  emptyBuilderTrack,
  lyricSkeleton,
  insertSkeleton,
  resetBuilder,
  applyBuilderControls,
  importAlbumBackup,
  moveAlbumTrack,
} from "../lib/studio/builder.ts";
import {
  parseRecordings,
  recordingPrompt,
} from "../lib/studio/recordings.ts";
import { validateStore } from "../lib/studio/validation.ts";

const brief = {
  ...DEFAULT_BRIEF,
  concept: "직접 검수",
  style: "acoustic pop, piano",
};
function track(id = "t1") {
  return {
    ...emptyBuilderTrack(brief),
    id,
    title: "기획곡 " + id,
    lyrics: "[Verse 1]\n작성한 가사",
    hook: "보존 구절",
  };
}
function album() {
  return {
    title: "앨범",
    summary: "검수 앨범",
    tracks: ["a", "b", "c"].map(track),
  };
}
test("editing album metadata through empty fields keeps the draft reloadable", () => {
  const s = blankStore();
  s.draft.album = { ...album(), title: "", summary: "" };
  assert.equal(validateStore(s).draft.album.title, "");
  assert.equal(validateStore(s).draft.album.summary, "");
});
test("blank builder remains editable without manufacturing title, lyrics or metadata", () => {
  const t = emptyBuilderTrack(brief);
  assert.equal(t.title, "");
  assert.equal(t.lyrics, "");
  assert.equal(t.style, brief.style);
  assert.equal(t.id, "");
});
test("skeleton respects selected structure, refuses lyrics overwrite and excludes singing for pure rap", () => {
  assert.match(lyricSkeleton({ ...brief, structure: "댄스 드롭" }), /\[Drop\]/);
  assert.match(lyricSkeleton({ ...brief, rapPct: 100 }), /\[Rapped Hook\]/);
  assert.doesNotMatch(lyricSkeleton({ ...brief, rapPct: 100 }), /\[Chorus\]/);
  assert.equal(lyricSkeleton({ ...brief, instrumental: true }), "");
  assert.throws(() => insertSkeleton(track(), brief), /보존/);
  assert.throws(
    () =>
      insertSkeleton(
        { ...track(), lyrics: "" },
        { ...brief, instrumental: true },
      ),
    /연주곡/,
  );
});
test("builder reset preserves member model, independent album, dance and can be restored by saved snapshot", () => {
  const s = blankStore();
  s.draft = {
    ...s.draft,
    brief: {
      ...brief,
      customModel: true,
      provider: "openai",
      model: "gpt-4.1",
    },
    song: track(),
    album: album(),
    albumBrief: brief,
    dance: { seed: brief, tags: ["piano"] },
  };
  const reset = resetBuilder(s.draft);
  assert.equal(reset.song, null);
  assert.equal(reset.brief.concept, "");
  assert.equal(reset.brief.style, "");
  assert.equal(reset.brief.model, "gpt-4.1");
  assert.equal(reset.brief.customModel, true);
  assert.equal(reset.album, s.draft.album);
  assert.equal(reset.dance, s.draft.dance);
});
test("explicit control merge preserves musical tags, title and lyrics while applying casting and arrangement", () => {
  const s = blankStore();
  s.draft.brief = { ...brief, voice: "여성 솔로", arrangement: "EDM 드롭" };
  s.draft.song = track();
  const next = applyBuilderControls(s.draft);
  assert.match(next.brief.style, /female solo vocals/);
  assert.match(next.brief.style, /instrumental drop/);
  assert.match(next.brief.style, /piano/);
  assert.equal(next.song.title, s.draft.song.title);
  assert.equal(next.song.lyrics, s.draft.song.lyrics);
  assert.equal(next.song.hook, s.draft.song.hook);
  assert.equal(next.song.style, next.brief.style);
});
test("album import preserves current builder and dance, merges saved items and rejects album-less JSON atomically", () => {
  const current = blankStore();
  current.draft.brief = brief;
  current.draft.song = track();
  current.draft.dance = { seed: brief, tags: ["piano"] };
  const incoming = blankStore();
  incoming.draft.album = album();
  incoming.draft.albumBrief = { ...brief, concept: "가져온 앨범" };
  const next = importAlbumBackup(current, incoming);
  assert.equal(next.draft.song, current.draft.song);
  assert.equal(next.draft.brief, current.draft.brief);
  assert.equal(next.draft.dance, current.draft.dance);
  assert.equal(next.draft.albumBrief.concept, "가져온 앨범");
  assert.throws(() => importAlbumBackup(current, blankStore()), /앨범이 포함/);
  assert.equal(current.draft.album, null);
});
test("track order changes preserve all track identities, lyrics and casting; boundaries do nothing", () => {
  const ts = album().tracks.map((t) => ({ ...t, voice: "여성 솔로" }));
  const moved = moveAlbumTrack(ts, "c", -1);
  assert.deepEqual(
    moved.map((t) => t.id),
    ["a", "c", "b"],
  );
  assert.equal(moved[1], ts[2]);
  assert.equal(moveAlbumTrack(ts, "a", -1), ts);
  assert.equal(moveAlbumTrack(ts, "missing", 1), ts);
  assert.equal(moveAlbumTrack(ts, "b", 2), ts);
});
const research = {
  text: "검수용 출처 요약",
  sources: [{ title: "검수 출처", url: "https://example.test/recording" }],
};
const payload = {
  artist: "검수 아티스트",
  summary: "검수 요약",
  recordings: [
    {
      title: "검수곡",
      artist: "검수 아티스트",
      year: null,
      sourceIndex: 0,
      summary: "자체 음악 분석",
      style: "acoustic pop, piano",
      bpm: 90,
      structure: "[Intro] > [Verse] > [Chorus]",
    },
  ],
};
test("recording analysis links to actual tool sources and preserves unknown year without copying lyrics", () => {
  const result = parseRecordings(JSON.stringify(payload), research);
  assert.equal(result.recordings[0].source, research.sources[0]);
  assert.equal(result.recordings[0].year, null);
  assert.equal(result.recordings[0].lyrics, "");
  assert.equal(result.recordings[0].reviewed, false);
  assert.match(recordingPrompt(), /untrusted/);
  assert.match(recordingPrompt(), /estimated/);
});
test("recording parser rejects nonexistent citation index, invented future year, duplicates and empty evidence", () => {
  for (const patch of [
    { sourceIndex: 999 },
    { year: new Date().getFullYear() + 1 },
    { style: "아이유 스타일" },
  ])
    assert.throws(() =>
      parseRecordings(
        JSON.stringify({
          ...payload,
          recordings: [{ ...payload.recordings[0], ...patch }],
        }),
        research,
      ),
    );
  assert.throws(
    () =>
      parseRecordings(
        JSON.stringify({
          ...payload,
          recordings: [...payload.recordings, ...payload.recordings],
        }),
        research,
      ),
    /중복/,
  );
  assert.throws(
    () =>
      parseRecordings(JSON.stringify({ ...payload, recordings: [] }), research),
    /출처/,
  );
  assert.throws(() => parseRecordings("invalid", research), /형식/);
});
