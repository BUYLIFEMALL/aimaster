import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BRIEF } from "../lib/studio/config.ts";
import {
  albumBrief,
  importBuilderSettings,
  trackBrief,
  castTrack,
  arrangeTracks,
  composeDance,
  updateAlbumTracks,
} from "../lib/studio/workflows.ts";
import { validateStore } from "../lib/studio/validation.ts";
import { blankStore } from "../lib/studio/storage.ts";
import { researchMusic, safeSources } from "../lib/studio/research.ts";
const track = {
  id: "t",
  title: "제목",
  summary: "설명",
  style: "house, 128 BPM, natural vocals",
  exclude: "",
  bpm: 128,
  lyrics: "원래 가사",
  hook: "원래 훅",
  reviewed: true,
};
const albumB = {
  ...DEFAULT_BRIEF,
  concept: "독립 앨범",
  intent: "끝은 희망",
  count: 12,
  arc: "사계절",
};
test("album settings survive backup independently, builder import preserves album narrative", () => {
  const s = blankStore();
  s.draft.brief = {
    ...DEFAULT_BRIEF,
    concept: "한 곡",
    intent: "편지",
    bpm: 140,
  };
  s.draft.albumBrief = albumB;
  const result = validateStore(s);
  assert.equal(result.draft.brief.concept, "한 곡");
  assert.equal(result.draft.albumBrief.concept, "독립 앨범");
  const imported = importBuilderSettings(s.draft);
  assert.equal(imported.bpm, 140);
  assert.equal(imported.concept, "독립 앨범");
  assert.equal(imported.intent, "끝은 희망");
  assert.equal(imported.arc, "사계절");
  assert.equal(imported.count, 12);
  delete s.draft.albumBrief;
  assert.equal(albumBrief(s.draft).concept, "한 곡");
});
test("per-track casting updates positive Style and queue controls while preserving lyrics and ID", () => {
  const cast = castTrack(DEFAULT_BRIEF, track, "여성 솔로", "남성 솔로");
  assert.equal(cast.id, track.id);
  assert.equal(cast.lyrics, track.lyrics);
  assert.equal(cast.reviewed, false);
  assert.match(cast.style, /female solo vocals/);
  const b = trackBrief({ ...DEFAULT_BRIEF, rapPct: 50 }, cast);
  assert.equal(b.voice, "여성 솔로");
  assert.equal(b.rapVoice, "남성 솔로");
  assert.equal(b.differentRapVoice, true);
  const s = blankStore();
  s.draft.song = cast;
  const restored = validateStore(s);
  assert.equal(restored.draft.song.voice, "여성 솔로");
  s.draft.song.voice = "unknown";
  assert.throws(() => validateStore(s));
});
test("album arrangement is atomic, deduplicated and preserves complete lyrics", () => {
  const b = { ...DEFAULT_BRIEF, arrangement: "가스펠" };
  const result = arrangeTracks([track], b);
  assert.match(result[0].style, /gospel choir/);
  assert.equal(result[0].lyrics, track.lyrics);
  assert.equal(arrangeTracks(result, b)[0].style, result[0].style);
  const long = { ...track, style: "a".repeat(997) };
  assert.throws(() => arrangeTracks([track, long], b));
  assert.equal(track.reviewed, true);
  assert.equal(long.style.length, 997);
  assert.doesNotMatch(
    arrangeTracks([track], { ...b, rapPct: 100 })[0].style,
    /gospel choir/,
  );
  assert.doesNotMatch(
    arrangeTracks([track], { ...b, instrumental: true })[0].style,
    /gospel choir/,
  );
});
test("dance BPM tags replace the seed tempo and keep metadata aligned", () => {
  const result = composeDance("house, 128 BPM, sub bass", [
    "140 BPM",
    "174 BPM",
    "sub bass",
  ]);
  assert.equal(result.bpm, 174);
  assert.doesNotMatch(result.style, /128 BPM|140 BPM/);
  assert.equal((result.style.match(/sub bass/g) || []).length, 1);
});
test("album control changes preserve local casting, clear obsolete exclusions and keep song tempos", () => {
  const previous = { ...DEFAULT_BRIEF, rapPct: 100 },
    next = { ...DEFAULT_BRIEF, voice: "남성 솔로" };
  const local = {
    ...track,
    voice: "여성 솔로",
    exclude: "singing, sung chorus, distorted drums",
    style:
      "house, 128 BPM, rap vocals from start to finish, rapped verses and rapped hook, rhythmic spoken delivery in every section, female solo vocals",
  };
  const result = updateAlbumTracks([local], previous, next)[0];
  assert.equal(result.bpm, 128);
  assert.match(result.style, /female solo vocals/);
  assert.doesNotMatch(result.exclude, /singing|sung chorus/);
  assert.match(result.exclude, /distorted drums/);
  assert.equal(result.lyrics, track.lyrics);
});
test("dance composition survives safe JSON backup and rejects malformed tag collections", () => {
  const s = blankStore();
  s.draft.dance = {
    seed: { ...DEFAULT_BRIEF, style: "house, 128 BPM" },
    tags: ["sub bass", "sub bass"],
  };
  const safe = validateStore(s);
  assert.deepEqual(safe.draft.dance.tags, ["sub bass"]);
  s.draft.dance.tags = [null];
  assert.throws(() => validateStore(s));
});
test("source URLs are deduplicated and reject executable schemes and credentials", () => {
  assert.deepEqual(
    safeSources([
      { title: "bad", url: "javascript:alert(1)" },
      { title: "bad", url: "https://u:p@example.com" },
      { title: "one", url: "https://example.com/" },
      { title: "two", url: "https://example.com/" },
    ]),
    [{ title: "one", url: "https://example.com/" }],
  );
});
const mock = (data, check) => async (url, options) => {
  check(url, JSON.parse(options.body), options);
  return new Response(JSON.stringify(data), { status: 200 });
};
test("Gemini research uses selected model, own header key, real grounding sources and attribution", async () => {
  const result = await researchMusic(
    "gemini",
    "gemini-test",
    "fixture",
    "topic",
    new AbortController().signal,
    mock(
      {
        candidates: [
          {
            content: { parts: [{ text: "음악 정보" }] },
            groundingMetadata: {
              groundingChunks: [
                { web: { uri: "https://example.com", title: "출처" } },
              ],
              searchEntryPoint: { renderedContent: "<p>Google</p>" },
            },
          },
        ],
      },
      (url, b, o) => {
        assert.match(url, /gemini-test/);
        assert.doesNotMatch(url, /fixture/);
        assert.equal(o.headers["x-goog-api-key"], "fixture");
        assert.ok(b.tools[0].google_search);
        assert.equal(b.generationConfig.responseMimeType, undefined);
      },
    ),
  );
  assert.equal(result.sources.length, 1);
  assert.match(result.suggestionsHtml, /Google/);
});
test("OpenAI research extracts Responses citations and uses selected model without fallback", async () => {
  const result = await researchMusic(
    "openai",
    "gpt-4.1",
    "fixture",
    "topic",
    new AbortController().signal,
    mock(
      {
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "음악 정보",
                annotations: [
                  {
                    type: "url_citation",
                    url: "https://example.com",
                    title: "출처",
                  },
                ],
              },
            ],
          },
        ],
      },
      (url, b) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        assert.equal(b.model, "gpt-4.1");
        assert.equal(b.tools[0].type, "web_search");
      },
    ),
  );
  assert.equal(result.sources.length, 1);
});
test("Claude research limits search uses, extracts citations and rejects tool errors", async () => {
  const result = await researchMusic(
    "anthropic",
    "claude-test",
    "fixture",
    "topic",
    new AbortController().signal,
    mock(
      {
        content: [
          {
            type: "text",
            text: "음악 정보",
            citations: [{ url: "https://example.com", title: "출처" }],
          },
        ],
      },
      (url, b) => {
        assert.equal(b.tools[0].max_uses, 2);
        assert.equal(b.model, "claude-test");
      },
    ),
  );
  assert.equal(result.sources.length, 1);
  await assert.rejects(
    () =>
      researchMusic(
        "anthropic",
        "claude-test",
        "fixture",
        "topic",
        new AbortController().signal,
        mock(
          {
            content: [
              {
                type: "web_search_tool_result",
                content: [
                  {
                    type: "web_search_tool_result_error",
                    error_code: "rate_limit_exceeded",
                  },
                ],
              },
            ],
          },
          () => {},
        ),
      ),
    /웹 검색 도구/,
  );
});
test("web research fails honestly when sources are absent, output is truncated or provider returns an error", async () => {
  await assert.rejects(
    () =>
      researchMusic(
        "gemini",
        "gemini-test",
        "fixture",
        "topic",
        new AbortController().signal,
        mock(
          { candidates: [{ content: { parts: [{ text: "no source" }] } }] },
          () => {},
        ),
      ),
    /출처/,
  );
  await assert.rejects(
    () =>
      researchMusic(
        "openai",
        "gpt-4.1",
        "fixture",
        "topic",
        new AbortController().signal,
        mock({ status: "incomplete" }, () => {}),
      ),
    /완성/,
  );
  let calls = 0;
  await assert.rejects(
    () =>
      researchMusic(
        "openai",
        "gpt-4.1",
        "fixture",
        "topic",
        new AbortController().signal,
        async () => {
          calls++;
          return new Response("private key detail", { status: 429 });
        },
      ),
    /429/,
  );
  assert.equal(calls, 1);
});
