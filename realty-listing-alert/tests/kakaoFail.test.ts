// L-6 카톡 실패 알리기(2026-11-16) 시험 — node --test
// 확인: 401/403/400/네트워크 분류 · 성공하면 표시 해제 · 끊긴 같은 토큰(캐시 포함) 재사용 금지 · 즉시 재전송 없음 · 토큰 비노출
import { test } from "node:test";
import assert from "node:assert/strict";
import { kakaoFailMessage, kakaoFailState, makeKakaoSender, sendKakaoMemo, shouldSkipKakao, tokenFingerprint } from "../extension/lib/notify.js";
import { buildSummary } from "../extension/lib/telegram.js";

const TOKEN = "kakao-access-token-SECRET-1234567890";
const httpErr = (status: number) => Object.assign(new Error(`카카오 보내기 실패(${status})`), { status });

/** 가짜 저장소·기록·발송 — 발송 횟수와 저장 내용을 센다 */
function harness(results: Array<"ok" | number | "net">) {
  const store: Record<string, unknown> = {};
  const logs: string[] = [];
  const sent: string[] = [];
  const send = async (token: string) => {
    sent.push(token);
    const r = results.shift();
    if (r === "ok") return;
    if (r === "net") throw new TypeError("Failed to fetch");
    throw httpErr(r as number);
  };
  const sender = makeKakaoSender({
    get: async (k: string) => ({ [k]: store[k] }),
    set: async (o: Record<string, unknown>) => { Object.assign(store, o); },
    log: async (t: string) => { logs.push(t); },
    send,
  });
  return { store, logs, sent, sender };
}

test("분류: 401·403 = 다시 연결, 400 = 거절, 응답 코드 없음 = 네트워크", () => {
  assert.equal(kakaoFailState(httpErr(401), "fp").kind, "reconnect");
  assert.equal(kakaoFailState(httpErr(403), "fp").kind, "reconnect");
  const r400 = kakaoFailState(httpErr(400), "fp");
  assert.equal(r400.kind, "rejected");
  assert.equal(r400.status, 400);
  const net = kakaoFailState(new TypeError("Failed to fetch"), "fp");
  assert.equal(net.kind, "network");
  assert.equal(net.status, 0);
});

test("안내 문구: 401은 다시 연결 안내, 400·네트워크는 다음 회차 안내", () => {
  assert.match(kakaoFailMessage(kakaoFailState(httpErr(401), "x")), /코드 401.*카카오 연결하기/);
  assert.match(kakaoFailMessage(kakaoFailState(httpErr(400), "x")), /코드 400.*다음 회차/);
  assert.match(kakaoFailMessage(kakaoFailState(new Error("x"), "x")), /인터넷 연결.*다음 회차/);
  assert.equal(kakaoFailMessage(null), "");
});

test("실제 발송 함수: 401 응답이면 status가 붙은 오류를 던지고 문구에 토큰이 없다", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ msg: "this access token does not exist", code: -401 }), { status: 401 })) as typeof fetch;
  try {
    await assert.rejects(sendKakaoMemo(TOKEN, "안녕"), (e: Error & { status?: number }) => {
      assert.equal(e.status, 401);
      assert.ok(!e.message.includes(TOKEN));
      return true;
    });
  } finally {
    globalThis.fetch = orig;
  }
});

test("토큰 지문: 16자리, 같은 토큰은 같고 다른 토큰은 다르며 토큰 글자를 담지 않는다", async () => {
  const a = await tokenFingerprint(TOKEN);
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(a, await tokenFingerprint(TOKEN));
  assert.notEqual(a, await tokenFingerprint(TOKEN + "x"));
  assert.ok(!TOKEN.includes(a));
});

test("401 뒤: 같은 토큰(캐시된 옛 설정)은 다시 보내지 않고, 다시 연결한 새 토큰은 보낸다", async () => {
  const h = harness([401, "ok"]);
  assert.equal(await h.sender({ accessToken: TOKEN }, "카톡 보내기", "1회차"), false);
  assert.equal((h.store.kakaoFailed as { kind: string }).kind, "reconnect");
  // 다음 회차 — 서버 설정 받기가 실패해 캐시의 같은 토큰이 들어와도 발송하지 않는다
  assert.equal(await h.sender({ accessToken: TOKEN }, "카톡 보내기", "2회차"), false);
  assert.equal(h.sent.length, 1);
  assert.match(h.logs.at(-1)!, /건너뜀/);
  // 회원이 다시 연결 → 새 토큰 → 보내고 성공하면 표시 해제
  assert.equal(await h.sender({ accessToken: TOKEN + "-new" }, "카톡 보내기", "3회차"), true);
  assert.equal(h.sent.length, 2);
  assert.equal(h.store.kakaoFailed, null);
});

test("403도 같은 토큰은 다시 보내지 않는다", async () => {
  const h = harness([403]);
  await h.sender({ accessToken: TOKEN }, "카톡 보내기", "1");
  await h.sender({ accessToken: TOKEN }, "카톡 보내기", "2");
  assert.equal(h.sent.length, 1);
});

test("400·네트워크 실패: 그 회차에 즉시 다시 보내지 않고, 다음 회차는 정상 흐름으로 보낸 뒤 성공하면 표시 해제", async () => {
  for (const first of [400, "net"] as const) {
    const h = harness([first, "ok"]);
    assert.equal(await h.sender({ accessToken: TOKEN }, "카톡 보내기", "1회차"), false);
    assert.equal(h.sent.length, 1); // 즉시 재시도 없음
    assert.ok(h.store.kakaoFailed);
    assert.equal(await h.sender({ accessToken: TOKEN }, "카톡 보내기", "2회차"), true); // 다음 회차
    assert.equal(h.sent.length, 2);
    assert.equal(h.store.kakaoFailed, null);
  }
});

test("성공만 했으면 상태를 건드리지 않는다(불필요한 저장 없음)", async () => {
  const h = harness(["ok"]);
  assert.equal(await h.sender({ accessToken: TOKEN }, "카톡 보내기", "1"), true);
  assert.equal("kakaoFailed" in h.store, false);
});

test("비밀값 비노출: 저장 상태·기록·안내에 토큰이 없다", async () => {
  const h = harness([401]);
  await h.sender({ accessToken: TOKEN }, "카톡 보내기", "1");
  await h.sender({ accessToken: TOKEN }, "카톡 보내기", "2");
  const dump = JSON.stringify(h.store) + h.logs.join("\n");
  assert.ok(!dump.includes(TOKEN));
  assert.deepEqual(Object.keys(h.store.kakaoFailed as object).sort(), ["at", "fp", "kind", "status"]);
});

test("다른 채널 요약: 카톡 실패가 있으면 맨 위에 한 줄, 없으면 없음", () => {
  const per = [{ name: "백송두산", total: 3, events: [], firstRun: false, complete: true }];
  const msg = kakaoFailMessage(kakaoFailState(httpErr(401), "f"));
  const withLine = buildSummary(per, { kakaoNotice: msg, now: new Date("2026-11-16T00:00:00Z") });
  assert.match(withLine.split("\n")[1], /^⚠ 카톡: 카카오 연결이 끊겼어요/);
  const without = buildSummary(per, { now: new Date("2026-11-16T00:00:00Z") });
  assert.ok(!/카톡/.test(without));
});
