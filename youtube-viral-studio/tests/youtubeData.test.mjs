// 공용 기준 코드 youtube-data-client 테스트 — 기준: youtube-channel-consultant/tests (docs/SHARED_MODULES.md, 2026-10-17).
// 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영한다. 실제 YouTube는 부르지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import {
  QuotaMeter,
  YouTubeDataError,
  fetchVideosByIds,
  maskApiKey,
  quotaResetKstText,
  toYouTubeDataError,
  youtubeRequest,
} from "../src/lib/youtube/youtubeData.ts";

const body = (reason, message = "") => ({ error: { message, errors: [{ reason }] } });
const res = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const noSleep = async () => {};

test("오류 구분: 일일 한도와 분당 제한을 다르게 안내", () => {
  const q = toYouTubeDataError(403, body("quotaExceeded"), new Date("2026-07-01T00:00:00Z"));
  assert.equal(q.code, "QUOTA_EXCEEDED");
  assert.match(q.message, /오후 4시/); // 7월 = 서머타임
  assert.equal(toYouTubeDataError(403, body("quotaExceeded"), new Date("2026-12-01T00:00:00Z")).message.includes("오후 5시"), true);
  assert.equal(toYouTubeDataError(403, body("rateLimitExceeded")).code, "RATE_LIMITED");
});

test("오류 구분: 키 문제 3종은 keyProblem", () => {
  const invalid = toYouTubeDataError(400, body("badRequest", "API key not valid. Please pass a valid API key."));
  assert.equal(invalid.code, "INVALID_KEY");
  const disabled = toYouTubeDataError(403, body("accessNotConfigured"));
  assert.equal(disabled.code, "API_NOT_ENABLED");
  const restricted = toYouTubeDataError(403, body("forbidden", "Requests from referer <empty> are blocked."));
  assert.equal(restricted.code, "KEY_RESTRICTED");
  assert.ok(invalid.keyProblem && disabled.keyProblem && restricted.keyProblem);
  assert.equal(toYouTubeDataError(403, body("quotaExceeded")).keyProblem, false);
});

test("키 가리기", () => {
  assert.equal(maskApiKey("https://x/y?part=a&key=AIzaSyABCDEFGHIJKLMNOPQRSTUV123&id=1"), "https://x/y?part=a&key=***&id=1");
  assert.equal(maskApiKey("bad AIzaSyABCDEFGHIJKLMNOPQRSTUV123 end"), "bad AIza*** end");
  assert.ok(!toYouTubeDataError(400, body("x", "fail key=AIzaSyABCDEFGHIJKLMNOPQRSTUV123")).message.includes("AIzaSyABC"));
  assert.match(quotaResetKstText(new Date("2026-01-15T00:00:00Z")), /오후 5시/);
});

test("성공: 할당량을 표 값으로 센다", async () => {
  const meter = new QuotaMeter();
  const urls = [];
  const fetchImpl = async (url) => (urls.push(url), res(200, { items: [] }));
  await youtubeRequest("search", { q: "캠핑" }, "K", { meter, fetchImpl });
  await youtubeRequest("videos", { id: "a" }, "K", { meter, fetchImpl });
  assert.equal(meter.used, 101);
  assert.match(urls[0], /\/search\?q=%EC%BA%A0%ED%95%91&key=K$/);
});

test("재사용 시간: 지정하면 revalidate, 비우면 no-store", async () => {
  const inits = [];
  const fetchImpl = async (_url, init) => (inits.push(init), res(200, {}));
  await youtubeRequest("search", {}, "K", { fetchImpl, revalidateSeconds: 120 });
  await youtubeRequest("search", {}, "K", { fetchImpl });
  assert.deepEqual(inits[0].next, { revalidate: 120 });
  assert.equal(inits[0].cache, undefined);
  assert.equal(inits[1].cache, "no-store");
});

test("서버 오류는 1회 재시도 후 성공", async () => {
  let n = 0;
  const meter = new QuotaMeter();
  const data = await youtubeRequest("videos", {}, "K", { meter, sleep: noSleep, fetchImpl: async () => (++n === 1 ? res(503, {}) : res(200, { items: [1] })) });
  assert.equal(n, 2);
  assert.deepEqual(data, { items: [1] });
  assert.equal(meter.used, 2);
});

test("키·한도 오류는 재시도하지 않는다", async () => {
  let n = 0;
  await assert.rejects(
    youtubeRequest("search", {}, "K", { sleep: noSleep, fetchImpl: async () => (n++, res(403, body("quotaExceeded"))) }),
    (e) => e instanceof YouTubeDataError && e.code === "QUOTA_EXCEEDED"
  );
  assert.equal(n, 1);
});

test("네트워크 끊김·시간 초과는 재시도 후 안내", async () => {
  let n = 0;
  await assert.rejects(
    youtubeRequest("videos", {}, "K", {
      sleep: noSleep,
      fetchImpl: async () => {
        n++;
        const e = new Error("timeout");
        e.name = "TimeoutError";
        throw e;
      },
    }),
    (e) => e.code === "TIMEOUT"
  );
  assert.equal(n, 2);
  await assert.rejects(
    youtubeRequest("videos", {}, "K", { sleep: noSleep, retries: 0, fetchImpl: async () => { throw new TypeError("fetch failed"); } }),
    (e) => e.code === "NETWORK"
  );
});

test("영상 상세는 50개씩 나눠 조회", async () => {
  const calls = [];
  const ids = Array.from({ length: 120 }, (_, i) => "v" + i);
  const meter = new QuotaMeter();
  const map = await fetchVideosByIds([...ids, "v1"], "K", "snippet", {
    meter,
    fetchImpl: async (url) => {
      const idParam = new URL(url).searchParams.get("id").split(",");
      calls.push(idParam.length);
      return res(200, { items: idParam.map((id) => ({ id })) });
    },
  });
  assert.deepEqual(calls, [50, 50, 20]);
  assert.equal(map.size, 120);
  assert.equal(meter.used, 3);
});
