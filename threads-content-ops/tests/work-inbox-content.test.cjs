// U10: 글 → 업무 워크스페이스 받은 업무 내용(순수 함수). 실행: npm test
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/workInboxContent.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { module: mod, exports: mod.exports, require });
const { threadsPostInboxContent, kstDate } = mod.exports;

test("한국 시간 날짜", () => {
  assert.equal(kstDate("2026-11-05T15:30:00.000Z"), "2026-11-06");
  assert.equal(kstDate(null), null);
});

test("발행 완료 글: 제목은 본문 첫 줄 60자, 캘린더 데이터에 채널 Threads·발행일·발행 주소", () => {
  const c = threadsPostInboxContent({ id: "p1", body: "\n오늘의 한 줄\n둘째 줄", status: "published", scheduled_at: null, published_at: "2026-11-05T09:30:00.000Z", permalink: "https://www.threads.net/@a/post/x", created_at: "2026-11-04T00:00:00.000Z" });
  assert.equal(c.title, "오늘의 한 줄");
  assert.deepEqual({ ...c.data }, { 채널: "Threads", 상태: "published", 발행일: "2026-11-05", "발행 주소": "https://www.threads.net/@a/post/x" }); // vm 밖으로 복사해 비교(원형 차이)
  assert.equal(c.bodyMd, "오늘의 한 줄\n둘째 줄\n\n---\n\n## 발행 정보\n\n- 상태: 발행 완료\n- 발행일: 2026-11-05\n- 발행 주소: https://www.threads.net/@a/post/x");
});

test("예약 글: 예약일만 · 본문 없으면 제목 대체 · 초안은 날짜 키 없음", () => {
  const s = threadsPostInboxContent({ id: "p2", body: "", status: "scheduled", scheduled_at: "2026-11-10T01:00:00.000Z", published_at: null, permalink: null, created_at: "2026-11-04T00:00:00.000Z" });
  assert.equal(s.title, "제목 없는 글");
  assert.deepEqual({ ...s.data }, { 채널: "Threads", 상태: "scheduled", 예약일: "2026-11-10" });
  const d = threadsPostInboxContent({ id: "p3", body: "x".repeat(80), status: "draft", scheduled_at: null, published_at: null, permalink: null, created_at: "2026-11-04T00:00:00.000Z" });
  assert.equal(d.title.length, 60);
  assert.deepEqual([...Object.keys(d.data)], ["채널", "상태"]);
});
