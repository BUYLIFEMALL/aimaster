import { test } from "node:test";
import assert from "node:assert/strict";
import { MOVED_NOTICE_HIDE_DAYS, isMovedNoticeHidden } from "../src/lib/movedNotice.ts";

test("이동 안내: 닫은 뒤 7일 동안만 숨김", () => {
  const now = Date.UTC(2026, 10, 1);
  const day = 86_400_000;
  assert.equal(MOVED_NOTICE_HIDE_DAYS, 7);
  assert.equal(isMovedNoticeHidden(null, now), false);
  assert.equal(isMovedNoticeHidden("abc", now), false);
  assert.equal(isMovedNoticeHidden(String(now - day), now), true);
  assert.equal(isMovedNoticeHidden(String(now - 7 * day), now), false);
  assert.equal(isMovedNoticeHidden(String(now + day), now), false); // 미래 시각(시계 어긋남)은 무시하고 보여 줌
});
