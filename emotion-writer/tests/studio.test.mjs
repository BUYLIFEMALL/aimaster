// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedPhotoUrl,
  parseQuotes,
  validateCopy,
  validateImage,
} from "../src/lib/studio/validation.ts";
import { wrapLines, coverRect, drawQuote } from "../src/lib/studio/render.ts";
import { ratioSize, DEFAULT_DESIGN } from "../src/lib/studio/config.ts";
import {
  generateCopy,
  generateImage,
  searchPhotos,
  photoDataUrl,
} from "../src/lib/studio/services.ts";

test("image downloader rejects internal hosts, impersonated CDN names, credentials, ports, and redirects", async () => {
  for (const url of [
    "http://cdn.pixabay.com/photo/a.jpg",
    "https://cdn.pixabay.com.evil.test/photo/a.jpg",
    "https://localhost/photo/a.jpg",
    "https://127.0.0.1/photo/a.jpg",
    "https://cdn.pixabay.com:444/photo/a.jpg",
    "https://user:pass@cdn.pixabay.com/photo/a.jpg",
    "https://cdn.pixabay.com/api/a.jpg",
    "https://images.pexels.com/photos/a.svg",
  ]) {
    assert.throws(() => allowedPhotoUrl(url));
  }
  assert.equal(
    allowedPhotoUrl(
      "https://images.pexels.com/photos/1/test.jpeg?auto=compress",
    ).hostname,
    "images.pexels.com",
  );
  await assert.rejects(
    photoDataUrl(
      "https://images.pexels.com/photos/1/test.jpeg",
      undefined,
      async (_url, opts) => {
        assert.equal(opts.redirect, "error");
        return new Response(null, {
          status: 302,
          headers: { location: "http://localhost" },
        });
      },
    ),
  );
});

test("quote candidates must be five distinct strings with bounded length", () => {
  const quotes = ["하루", "햇살", "미소", "바람", "행복"];
  assert.deepEqual(parseQuotes(JSON.stringify({ quotes })), quotes);
  assert.throws(() =>
    parseQuotes(JSON.stringify({ quotes: Array(5).fill("같은 글귀") })),
  );
  assert.throws(() =>
    parseQuotes(
      JSON.stringify({ quotes: [...quotes.slice(0, 4), "가".repeat(701)] }),
    ),
  );
  assert.throws(() => parseQuotes(JSON.stringify({ quotes: ["한 개"] })));
  assert.throws(() => parseQuotes("not json"));
});

test("input validation rejects unsupported or injected models and oversize topics before API calls", () => {
  const base = {
    topic: "아침 인사",
    style: "시",
    lines: 5,
    model: "gemini-2.5-flash",
  };
  assert.equal(validateCopy(base).topic, "아침 인사");
  assert.throws(() => validateCopy({ ...base, model: "models/other:delete" }));
  assert.throws(() => validateCopy({ ...base, topic: "가".repeat(121) }));
  assert.throws(() => validateCopy({ ...base, lines: 30 }));
  assert.throws(() =>
    validateImage({
      topic: "봄",
      quote: "꽃",
      ratio: "2:1",
      model: "gemini-nano-banana-2.1",
    }),
  );
});

test("Korean and emoji wrap without splitting Unicode code points and preserve explicit line breaks", () => {
  const lines = wrapLines(
    "한글🙂\n아침햇살",
    3,
    (value) => Array.from(value).length,
  );
  assert.deepEqual(lines, ["한글🙂", "아침햇", "살"]);
  assert.deepEqual(
    wrapLines("첫줄\n\n끝", 10, (value) => value.length),
    ["첫줄", "", "끝"],
  );
});

test("all export sizes preserve ratios; portrait photo crop covers square canvas", () => {
  assert.deepEqual(ratioSize("9:16"), { width: 1080, height: 1920 });
  assert.deepEqual(ratioSize("1:1"), { width: 1080, height: 1080 });
  assert.deepEqual(ratioSize("3:4"), { width: 1080, height: 1440 });
  assert.deepEqual(coverRect(100, 200, 1080, 1080), {
    x: 0,
    y: -540,
    width: 1080,
    height: 2160,
  });
});

test("long Korean text fits inside the image using the same renderer and resets shadow after drawing", () => {
  const drawn = [];
  const ctx = {
    font: "",
    clearRect() {},
    drawImage() {},
    fillRect() {},
    measureText(s) {
      return { width: Array.from(s).length * parseFloat(this.font) };
    },
    fillText(s, x, y) {
      drawn.push({ s, x, y, font: this.font });
    },
  };
  drawQuote(
    ctx,
    1080,
    1080,
    { naturalWidth: 1080, naturalHeight: 1920 },
    "가".repeat(700),
    DEFAULT_DESIGN,
  );
  assert.ok(drawn.length > 1);
  assert.ok(drawn.every((x) => x.x === 540 && x.y >= 0 && x.y < 1080));
  assert.ok(parseFloat(drawn[0].font) < DEFAULT_DESIGN.size);
  assert.equal(ctx.shadowBlur, 0);
});

test("Gemini quote adapter sends only the provided personal key in a header and validates output", async () => {
  const result = await generateCopy(
    "personal-test-key",
    validateCopy({
      topic: "봄",
      style: "시",
      lines: 5,
      model: "gemini-2.5-flash",
    }),
    undefined,
    async (url, opts) => {
      assert.ok(!String(url).includes("personal-test-key"));
      assert.equal(opts.headers["x-goog-api-key"], "personal-test-key");
      assert.ok(
        JSON.parse(opts.body).contents[0].parts[0].text.includes(
          String(new Date().getFullYear()),
        ),
      );
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    quotes: ["봄", "꽃", "빛", "미소", "바람"],
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  );
  assert.equal(result.length, 5);
});

test("image adapter extracts image from mixed text/image response and exposes no provider raw errors", async () => {
  const input = validateImage({
    topic: "봄",
    quote: "안녕",
    ratio: "3:4",
    model: "gemini-3.1-flash-lite-image",
  });
  assert.equal(
    await generateImage(
      "personal-test-key",
      input,
      undefined,
      async (_url, opts) => {
        assert.equal(
          JSON.parse(opts.body).generationConfig.imageConfig.aspectRatio,
          "3:4",
        );
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  { text: "background" },
                  { inlineData: { mimeType: "image/png", data: "aGVsbG8=" } },
                ],
              },
            },
          ],
        });
      },
    ),
    "data:image/png;base64,aGVsbG8=",
  );
  await assert.rejects(
    generateImage(
      "personal-test-key",
      input,
      undefined,
      async () => new Response("SECRET-ERROR", { status: 403 }),
    ),
    (e) => !e.message.includes("SECRET") && /API/.test(e.message),
  );
});

test("Pexels uses personal authorization and preserves source, author and original link", async () => {
  const photos = await searchPhotos(
    "pexels",
    "personal-test-key",
    "forest",
    "9:16",
    undefined,
    async (url, opts) => {
      assert.equal(opts.headers.Authorization, "personal-test-key");
      assert.equal(new URL(url).searchParams.get("orientation"), "portrait");
      return Response.json({
        photos: [
          {
            id: 1,
            photographer: "작가",
            url: "https://www.pexels.com/photo/1/",
            src: {
              large2x: "https://images.pexels.com/photos/1/1.jpeg",
              medium: "https://images.pexels.com/photos/1/1.jpeg",
            },
          },
          {
            id: 2,
            url: "https://evil.test",
            src: {
              large2x: "http://localhost/a.jpg",
              medium: "http://localhost/a.jpg",
            },
          },
        ],
      });
    },
  );
  assert.equal(photos.length, 1);
  assert.equal(photos[0].author, "작가");
  assert.equal(photos[0].source, "pexels");
});

test("Pixabay uses the supplied key, safe search and excludes broken image rows", async () => {
  const result = await searchPhotos(
    "pixabay",
    "personal-test-key",
    "flowers",
    "1:1",
    undefined,
    async (url) => {
      const u = new URL(url);
      assert.equal(u.searchParams.get("key"), "personal-test-key");
      assert.equal(u.searchParams.get("safesearch"), "true");
      return Response.json({
        hits: [
          {
            id: 3,
            user: "작가",
            pageURL: "https://pixabay.com/photos/3/",
            largeImageURL: "https://cdn.pixabay.com/photo/3.jpg",
            webformatURL: "https://cdn.pixabay.com/photo/3.jpg",
          },
        ],
      });
    },
  );
  assert.equal(result[0].source, "pixabay");
});

test("download rejects HTML and oversized streaming bodies even without Content-Length", async () => {
  const url = "https://images.pexels.com/photos/1/1.jpeg";
  await assert.rejects(
    photoDataUrl(
      url,
      undefined,
      async () =>
        new Response("<script>bad</script>", {
          headers: { "content-type": "text/html" },
        }),
    ),
  );
  await assert.rejects(
    photoDataUrl(
      url,
      undefined,
      async () =>
        new Response(new Uint8Array(3 * 1024 * 1024 + 1), {
          headers: { "content-type": "image/jpeg" },
        }),
    ),
    /3MB/,
  );
});
