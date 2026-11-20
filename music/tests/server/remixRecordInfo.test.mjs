// 리믹스 전용 record-info 조회(lib/remixRecordInfo.ts) — 공용 checkSunoGenerationStatus와 같은 계약인지 같은 입력으로 비교.
// server-only 파일(lib/ai/suno.ts)을 불러오므로 --conditions=react-server로 실행(package.json test 참조). 실제 네트워크 없음(가짜 fetch).
import test from "node:test";
import assert from "node:assert/strict";
import { checkSunoGenerationStatus, sunoStatusHint } from "../../lib/ai/suno.ts";
import { requestRemixRecordInfo, parseRemixRecordInfo, toSunoPollResult } from "../../lib/remixRecordInfo.ts";

const realFetch = globalThis.fetch;
function fakeFetch(res) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization ?? null, signal: init?.signal ?? null });
    if (res.throw) throw new TypeError(res.throw);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      text: async () => (typeof res.body === "string" ? res.body : JSON.stringify(res.body)),
      json: async () => res.body,
    };
  };
  return { fn, calls };
}
async function runBoth(res, taskId = "T0", key = "k") {
  const a = fakeFetch(res);
  globalThis.fetch = a.fn;
  let shared, sharedErr;
  try { shared = await checkSunoGenerationStatus(taskId, key); } catch (e) { sharedErr = e; } finally { globalThis.fetch = realFetch; }
  const b = fakeFetch(res);
  let mine, mineErr;
  try { mine = await requestRemixRecordInfo(taskId, key, { fetch: b.fn, statusHint: sunoStatusHint }); } catch (e) { mineErr = e; }
  return { shared, sharedErr, mine, mineErr, sharedCalls: a.calls, mineCalls: b.calls };
}

const body = (status, sunoData, extra = {}) => ({ code: 200, data: { status, response: { sunoData }, ...extra } });
const CASES = [
  ["완료·낙타 표기", { status: 200, body: body("SUCCESS", [{ id: "A1", audioUrl: "https://x/a1.mp3", imageUrl: "https://x/a1.jpg", title: "t", duration: 176, prompt: "표본 가사 가" }, { id: "A2", audioUrl: "https://x/a2.mp3", duration: 175 }]) }],
  ["완료·밑줄 표기", { status: 200, body: body("SUCCESS", [{ id: "A1", audio_url: "https://x/a1.mp3", stream_audio_url: "https://x/s.mp3", image_url: "https://x/i.jpg" }]) }],
  ["완료인데 곡 0개", { status: 200, body: body("SUCCESS", []) }],
  ["진행 중", { status: 200, body: body("FIRST_SUCCESS", []) }],
  ["생성 실패", { status: 200, body: { code: 200, data: { status: "GENERATE_AUDIO_FAILED", errorMessage: "fail" } } }],
  ["민감어", { status: 200, body: { code: 200, data: { status: "SENSITIVE_WORD_ERROR" } } }],
  ["HTTP 401", { status: 401, body: "unauthorized" }],
  ["HTTP 500", { status: 500, body: "err" }],
  ["연결 끊김", { throw: "fetch failed" }],
];

for (const [name, res] of CASES) {
  test(`계약 동일 — ${name}`, async () => {
    const r = await runBoth(res);
    assert.equal(r.sharedCalls.length, 1, "공용 함수 요청 1회");
    assert.equal(r.mineCalls.length, 1, "리믹스 함수 요청 1회(추가 호출 없음)");
    assert.equal(r.mineCalls[0].url, r.sharedCalls[0].url, "같은 주소");
    assert.equal(r.mineCalls[0].auth, r.sharedCalls[0].auth, "같은 인증 머리글(회원 키)");
    assert.equal(r.mineCalls[0].signal, r.sharedCalls[0].signal, "시간 제한 계약 같음(둘 다 없음)");
    if (r.sharedErr) {
      assert.ok(r.mineErr, "공용이 예외면 리믹스도 예외");
      assert.equal(r.mineErr.message, r.sharedErr.message, "같은 오류 문구");
      return;
    }
    assert.ok(!r.mineErr);
    assert.deepEqual(toSunoPollResult(r.mine), r.shared, "prompt를 빼면 결과 동일");
  });
}

test("곡별 prompt는 문자열일 때만, 해당 곡에만 붙는다", () => {
  const r = parseRemixRecordInfo(body("SUCCESS", [{ id: "A1", audioUrl: "u1", prompt: "표본 가사 가" }, { id: "A2", audioUrl: "u2", prompt: 3 }, { id: "A3", audioUrl: "u3", lyrics: "추측 칸" }]));
  assert.equal(r.state, "ready");
  assert.equal(r.tracks[0].prompt, "표본 가사 가");
  assert.ok(!("prompt" in r.tracks[1]), "문자열 아님 → 없음");
  assert.ok(!("prompt" in r.tracks[2]) && !("lyrics" in r.tracks[2]), "추측 칸은 읽지 않음");
});

test("키 없으면 요청 없이 예외(공용과 같은 문구)", async () => {
  const r = await runBoth({ status: 200, body: body("SUCCESS", []) }, "T0", "");
  assert.equal(r.sharedCalls.length, 0);
  assert.equal(r.mineCalls.length, 0);
  assert.equal(r.mineErr?.message, r.sharedErr?.message);
});
