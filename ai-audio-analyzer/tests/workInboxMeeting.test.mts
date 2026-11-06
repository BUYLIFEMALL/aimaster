// U9-A 시험: node ai-audio-analyzer/tests/workInboxMeeting.test.mts (Node 22.18+ 타입 제거 실행)
import { meetingInboxContent } from "../src/lib/workInboxMeeting.ts";
import assert from "node:assert/strict";
const r = meetingInboxContent({ summary: "예산 검토 회의", technicalInfo: { duration: "00:15", language: "한국어" }, speakerAnalysis: [{ name: "김민수", role: "팀장", keyContribution: "예산 확정", style: "단호" }], actionItems: [{ task: "견적서\n보내기", assignee: "이지은", dueDate: "11/10" }], keyQuestions: [{ question: "예산은?", asker: "김민수", context: "" }], topicsAndKeywords: [{ topic: "예산", keywords: ["견적", "일정"] }], overallInsights: "빠른 결정", fullTranscription: [{ timestamp: "00:00", speaker: "김민수", text: "시작합니다" }] }, new Date("2026-11-06T00:00:00Z"));
assert.equal(r.title, "음성 분석 회의록 2026-11-06 — 예산");
assert.match(r.bodyMd, /- \[ \] 견적서 보내기 \(담당: 이지은, 기한: 11\/10\)/);
assert.match(r.bodyMd, /## 전체 받아쓰기\n- \[00:00\] 김민수: 시작합니다/);
assert.throws(() => meetingInboxContent({}), /보낼 음성 분석 결과가 없습니다/);
assert.throws(() => meetingInboxContent("x"));
const big = meetingInboxContent({ summary: "s", fullTranscription: Array.from({ length: 5000 }, () => ({ timestamp: "0", speaker: "a", text: "가".repeat(2000) })) });
assert.ok(big.bodyMd.length <= 200000 && big.bodyMd.includes("이하 생략"));
console.log("시험 통과 6개\n" + r.bodyMd);
