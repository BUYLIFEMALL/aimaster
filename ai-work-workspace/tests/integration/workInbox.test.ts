// U7 업무 받은편지함: 표 행 CSV 만들기와 보내기 검사(공용 표 호출 없이 순수 함수만)
import { describe, expect, it } from "vitest";
import { inboxRowCsv } from "@/server/workInboxCsv";
import { validateWorkInboxItem } from "@/lib/workInbox";

describe("work inbox", () => {
  it("builds a one-row CSV with Korean headers, kind label and simple data values", () => {
    const csv = inboxRowCsv({
      title: '보고서, "초안"',
      source_slug: "ai-task-planner",
      kind: "task",
      created_at: "2026-10-24T16:00:00.000Z",
      source_url: "https://ai-task-planner.buylife.xyz/x",
      data: { 마감일: "2026-10-30", 담당: ["나", "팀"], 무시: { a: 1 } },
    });
    const [head, row] = csv.trim().split("\n");
    expect(head).toBe("이름,보낸 프로그램,종류,받은 날,원본 링크,마감일,담당");
    expect(row).toBe('"보고서, ""초안""",ai-task-planner,할 일,2026-10-25,https://ai-task-planner.buylife.xyz/x,2026-10-30,"나, 팀"');
  });

  it("validates items before sending", () => {
    const ok = { userId: "11111111-1111-1111-1111-111111111111", sourceSlug: "ai-task-planner", title: "오늘 할 일" };
    expect(validateWorkInboxItem(ok)).toBeNull();
    expect(validateWorkInboxItem({ ...ok, userId: "x" })).toMatch(/회원/);
    expect(validateWorkInboxItem({ ...ok, sourceSlug: "Bad Slug" })).toMatch(/slug/);
    expect(validateWorkInboxItem({ ...ok, title: " " })).toMatch(/제목/);
    expect(validateWorkInboxItem({ ...ok, sourceUrl: "http://x" })).toMatch(/https/);
  });
});
