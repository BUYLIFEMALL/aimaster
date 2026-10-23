// 병합 B-6: 수정본 이력 넣기·읽기·문단 비교. 네트워크·AI 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pushRevision, readRevisions, diffParagraphs, MAX_REVISIONS } from "../lib/draftRevisions.ts";

test("push only when changed, skip duplicate of the latest, cap at 10", () => {
  const a = { title: "제목", body: "본문 A" }, b = { title: "제목", body: "본문 B" };
  assert.deepEqual(pushRevision([], a, a, "직접 수정"), []);
  const one = pushRevision([], a, b, "직접 수정", "2026-10-24T00:00:00Z");
  assert.deepEqual(one, [{ at: "2026-10-24T00:00:00Z", title: "제목", body: "본문 A", reason: "직접 수정" }]);
  assert.equal(pushRevision(one, a, { title: "새", body: "C" }, "직접 수정"), one);
  let list = [];
  for (let i = 0; i < 15; i++) list = pushRevision(list, { title: "t", body: `v${i}` }, { title: "t", body: `v${i + 1}` }, "직접 수정");
  assert.equal(list.length, MAX_REVISIONS); assert.equal(list[0].body, "v14");
  assert.deepEqual(readRevisions([{ at: "x" }, ...list, null]).length, MAX_REVISIONS);
  assert.deepEqual(readRevisions("bad"), []);
});

test("paragraph diff marks added, deleted and unchanged paragraphs in order", () => {
  const older = "첫 문단\n\n둘째 문단\n\n셋째 문단";
  const newer = "첫 문단\n\n둘째 문단 고침\n\n셋째 문단\n\n넷째 문단";
  assert.deepEqual(diffParagraphs(older, newer), [
    { type: "same", text: "첫 문단" }, { type: "del", text: "둘째 문단" }, { type: "add", text: "둘째 문단 고침" },
    { type: "same", text: "셋째 문단" }, { type: "add", text: "넷째 문단" },
  ]);
  assert.deepEqual(diffParagraphs("같음", "같음"), [{ type: "same", text: "같음" }]);
});
