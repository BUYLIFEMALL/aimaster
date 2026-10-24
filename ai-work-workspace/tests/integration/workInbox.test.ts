// U7 업무 받은편지함: 표 행 CSV 만들기와 보내기 검사(공용 표 호출 없이 순수 함수만)
import { describe, expect, it } from "vitest";
import { inboxRowCsv } from "@/server/workInboxCsv";
import { validateWorkInboxItem } from "@/lib/workInbox";
import { uncheckedTodos, pageAsTask } from "@/server/workInboxPlannerItems";

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

  it("U8-B: picks unchecked to-dos (nested, not inside sub-pages) and reads row date/priority", () => {
    const B = (id: string, type: string, extra: Record<string, unknown> = {}) => ({ id, type, alive: true, parent_id: "p", parent_table: "block", space_id: "s", ...extra }) as any;
    const recs: Record<string, any> = {
      a: B("a", "to_do", { properties: { title: [["보고서 쓰기"]] }, content: ["a1"] }),
      a1: B("a1", "to_do", { properties: { title: [["  표 정리\n하기 "]] } }),
      b: B("b", "to_do", { properties: { title: [["끝난 일"]], checked: [["Yes"]] } }),
      c: B("c", "page", { content: ["c1"] }),
      c1: B("c1", "to_do", { properties: { title: [["하위 페이지 할 일"]] } }),
      d: B("d", "to_do", { properties: { title: [[" "]] } }),
    };
    const page = B("p", "page", { content: ["a", "b", "c", "d"] });
    expect(uncheckedTodos((id) => recs[id], page)).toEqual(["보고서 쓰기", "표 정리 하기"]);
    expect(uncheckedTodos((id) => recs[id], page, 1)).toEqual(["보고서 쓰기"]);
    const coll = { schema: { title: { name: "이름", type: "title" }, x: { name: "만든 날", type: "date" }, y: { name: "마감일", type: "date" }, z: { name: "우선순위", type: "select" } } } as any;
    const row = B("r", "page", { parent_table: "collection", properties: { title: [["기획서 마무리"]], x: [["‣", [["d", { type: "date", start_date: "2026-10-01" }]]]], y: [["‣", [["d", { type: "date", start_date: "2026-10-30" }]]]], z: [["높음"]] } });
    expect(pageAsTask(row, coll)).toEqual({ title: "기획서 마무리", data: { 예정일: "2026-10-30", 우선순위: "높음" } });
    expect(pageAsTask(B("q", "page", { properties: {} }))).toEqual({ title: "제목 없는 페이지", data: {} });
  });

  it("validates items before sending", () => {
    const ok = { userId: "11111111-1111-1111-1111-111111111111", sourceSlug: "ai-task-planner", title: "오늘 할 일" };
    expect(validateWorkInboxItem(ok)).toBeNull();
    expect(validateWorkInboxItem({ ...ok, userId: "x" })).toMatch(/회원/);
    expect(validateWorkInboxItem({ ...ok, sourceSlug: "Bad Slug" })).toMatch(/slug/);
    expect(validateWorkInboxItem({ ...ok, title: " " })).toMatch(/제목/);
    expect(validateWorkInboxItem({ ...ok, sourceUrl: "http://x" })).toMatch(/https/);
    expect(validateWorkInboxItem({ ...ok, targetSlug: "Bad Target" })).toMatch(/받는 프로그램/);
    expect(validateWorkInboxItem({ ...ok, targetSlug: "ai-task-planner" })).toBeNull();
  });
});
