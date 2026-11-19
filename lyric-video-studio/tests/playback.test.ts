import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAY_FAIL_EVENT, playFailText, tryPlay } from "../src/lib/playback.ts";

const err = (name: string) => Object.assign(new Error(name), { name });

/** play()만 흉내 내는 가짜 플레이어 — 실패 사건으로 온 안내 문장을 모은다 */
function fakePlayer(play: () => Promise<void>) {
  const target = new EventTarget();
  const notices: string[] = [];
  target.addEventListener(PLAY_FAIL_EVENT, (e) => notices.push((e as CustomEvent<string>).detail));
  return { player: { play, dispatchEvent: (e: Event) => target.dispatchEvent(e) }, notices };
}

test("정상 중단(AbortError — 재생 중 일시정지·음악 파일 교체)은 안내하지 않는다", () => {
  assert.equal(playFailText(err("AbortError")), null);
});

test("자동 재생 차단(NotAllowedError)은 재생 버튼을 다시 누르라고 안내한다", () => {
  assert.match(playFailText(err("NotAllowedError")) ?? "", /자동 재생을 막았습니다/);
});

test("재생할 수 없는 파일(NotSupportedError)은 다른 형식으로 넣으라고 안내한다", () => {
  assert.match(playFailText(err("NotSupportedError")) ?? "", /mp3나 m4a/);
});

test("그 밖의 실패·이름 없는 값도 일반 안내를 한다(조용히 버리지 않음)", () => {
  assert.match(playFailText(err("NetworkError")) ?? "", /시작하지 못했습니다/);
  assert.match(playFailText("문자열 거절") ?? "", /시작하지 못했습니다/);
  assert.match(playFailText(undefined) ?? "", /시작하지 못했습니다/);
});

test("tryPlay — 재생 성공이면 안내 사건이 없다", async () => {
  const { player, notices } = fakePlayer(() => Promise.resolve());
  await tryPlay(player);
  assert.deepEqual(notices, []);
});

test("tryPlay — 차단되면 안내 사건 1번, 예외는 밖으로 나오지 않는다", async () => {
  const { player, notices } = fakePlayer(() => Promise.reject(err("NotAllowedError")));
  await tryPlay(player);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /자동 재생을 막았습니다/);
});

test("tryPlay — 정상 중단(AbortError)은 안내 사건이 없다", async () => {
  const { player, notices } = fakePlayer(() => Promise.reject(err("AbortError")));
  await tryPlay(player);
  assert.deepEqual(notices, []);
});

test("tryPlay — play()가 바로 예외를 던져도 안내로 바꾸고 멈추지 않는다", async () => {
  const { player, notices } = fakePlayer(() => { throw err("NotSupportedError"); });
  await tryPlay(player);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /mp3나 m4a/);
});
