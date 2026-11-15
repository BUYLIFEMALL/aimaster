// U7 업무 받은편지함: 표 행 CSV 만들기와 보내기 검사(공용 표 호출 없이 순수 함수만)
import { describe, expect, it } from "vitest";
import { inboxRowCsv, calendarRowCsv, calendarStatus, isCalendarItem } from "@/server/workInboxCsv";
import { TEMPLATES } from "@/litpage/server/content/catalog.ts";
import { validateWorkInboxItem } from "@/lib/workInbox";
import { uncheckedTodos, pageAsTask, plannerKey, skipPendingPlanner, PLANNER_ROWS_LIMIT } from "@/server/workInboxPlannerItems";
import { cleanPageMarkdownForSend } from "@/server/workInboxSendMarkdown";
import { pageToMarkdown, type MdBlock, type MdSource } from "@/litpage/server/ai/prompts.ts";

describe("work inbox", () => {
  it("U9: meeting notes serialize without section indent, and the sent markdown drops citations / internal labels", () => {
    const B = (id: string, type: string, extra: Record<string, unknown> = {}): MdBlock => ({ id, type, alive: true, ...extra });
    const recs: Record<string, MdBlock> = {
      p: B("p", "page", { content: ["m", "db", "sub"] }),
      m: B("m", "meeting_notes", { properties: { title: [["주간 회의"]] }, content: ["s1", "s2"] }),
      s1: B("s1", "text", { format: { meeting_section: "summary" }, content: ["h", "li"] }),
      h: B("h", "sub_sub_header", { properties: { title: [["할 일"]] } }),
      li: B("li", "bulleted_list", { properties: { title: [["초안 작성 "], ["1", [["a", "#mtg-cite-07fb34f6-0269-4d6b-834a-1834052be9dc"]]]] } }),
      s2: B("s2", "text", { format: { meeting_section: "transcript" }, content: ["t"] }),
      t: B("t", "text", { properties: { title: [["회의를 시작합니다"]] } }),
      db: B("db", "collection_view_page", { collection_id: "c" }),
      sub: B("sub", "page"),
    };
    const src: MdSource = {
      block: (id) => recs[id],
      pageTitle: (id) => (id === "sub" ? "" : id === "db" ? "Untitled database" : "주간 회의"),
      userName: () => "",
      collection: (id) => (id === "c" ? { name: "", schema: {}, rows: [B("r1", "page"), B("r2", "page")] } : undefined),
    };
    const raw = pageToMarkdown("p", src, { includeTitle: false }).markdown;
    expect(raw).toContain("**주간 회의**\n\n### 할 일\n- 초안 작성 [1](#mtg-cite-07fb34f6-0269-4d6b-834a-1834052be9dc)\n회의를 시작합니다");
    expect(raw).not.toMatch(/^ {2,}/m);
    expect(cleanPageMarkdownForSend(raw)).toBe("**주간 회의**\n\n### 할 일\n- 초안 작성\n회의를 시작합니다\n\n(표: 제목 없는 표, 2행)\n\n(하위 페이지: 제목 없음)");
  });

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
    expect(row).toBe('"보고서, ""초안""",AI 할 일 플래너,할 일,2026-10-25,https://ai-task-planner.buylife.xyz/x,2026-10-30,"나, 팀"');
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
    // CSV로 만든 표: 우선순위·예정일이 글자 칸, 「받은 날」 날짜 칸은 이름이 맞지 않아 쓰지 않음
    const csvColl = { schema: { a: { name: "받은 날", type: "date" }, b: { name: "예정일", type: "text" }, c: { name: "우선순위", type: "text" }, d: { name: "메모", type: "text" } } } as any;
    const csvRow = B("r2", "page", { parent_table: "collection", properties: { title: [["보고"]], a: [["‣", [["d", { type: "date", start_date: "2026-10-24" }]]]], b: [["2026-11-02"]], c: [["낮음"]], d: [["2026-01-01"]] } });
    expect(pageAsTask(csvRow, csvColl)).toEqual({ title: "보고", data: { 예정일: "2026-11-02", 우선순위: "낮음" } });
  });

  it("U10: calendar row CSV headers equal the content-calendar template columns, and only posts with channel+date qualify", () => {
    const tpl = TEMPLATES.find((t) => t.id === "content-calendar");
    expect(tpl).toBeTruthy();
    const spec = tpl!.build();
    const names = Object.values(spec.db!.schema).map((p) => p.name);
    const csv = calendarRowCsv({
      title: "신제품 소개",
      source_slug: "auto-instagram-posting",
      kind: "document",
      created_at: "2026-11-06T10:00:00.000Z",
      source_url: "https://auto-instagram-posting.buylife.xyz/posts/1",
      data: { 채널: "인스타그램", 상태: "published", 발행일: "2026-11-05T09:30:00+09:00", "발행 주소": "https://www.instagram.com/p/x" },
      body_md: "\n첫 줄 요약\n둘째 줄",
    });
    const [head, row] = csv.trim().split("\n");
    expect(head.split(",")).toEqual(names);
    expect(spec.db!.views[0].type).toBe("calendar");
    expect(Object.values(spec.db!.schema).filter((p) => p.type === "date")).toHaveLength(1);
    expect(row).toBe("신제품 소개,2026-11-05,인스타그램,발행 완료,https://www.instagram.com/p/x,INSTA 포스팅 자동화,https://auto-instagram-posting.buylife.xyz/posts/1,첫 줄 요약");
    // 모르는 채널은 「기타」, 예약 글은 예약일·예약됨
    const r2 = calendarRowCsv({ title: "t", source_slug: "x", kind: "document", created_at: "2026-11-06T10:00:00.000Z", source_url: null, data: { 채널: "카카오", 상태: "scheduled", 예약일: "2026-11-10" } }).trim().split("\n")[1];
    expect(r2).toBe("t,2026-11-10,기타,예약됨,,x,,");
    expect(calendarStatus("failed")).toBe("실패");
    expect(calendarStatus(undefined)).toBe("초안");
    expect(isCalendarItem({ 채널: "Threads", 예약일: "2026-11-10" })).toBe(true);
    expect(isCalendarItem({ 채널: "Threads" })).toBe(false);
    expect(isCalendarItem({ 발행일: "2026-11-10" })).toBe(false);
    expect(isCalendarItem(null)).toBe(false);
  });

  it("플래너 2번: 플래너에 대기 중인 같은 항목(주소+제목)과 묶음 안 겹침은 건너뛰고, 행 묶음은 50개까지", () => {
    const a = "https://w.example/p/1", b = "https://w.example/p/2";
    const items = [
      { title: "보고서 쓰기", data: {}, sourceUrl: a },
      { title: "보고서 쓰기", data: {}, sourceUrl: b }, // 다른 페이지의 같은 제목은 다른 항목
      { title: "회의 준비", data: { 예정일: "2026-11-20" }, sourceUrl: a },
      { title: "회의 준비", data: {}, sourceUrl: a }, // 묶음 안 겹침
    ];
    const r = skipPendingPlanner(items, [plannerKey(a, "  보고서 쓰기 ")]); // 저장값은 trim 기준
    expect(r.send.map((i) => `${i.sourceUrl}|${i.title}`)).toEqual([`${b}|보고서 쓰기`, `${a}|회의 준비`]);
    expect(r.send[1].data).toEqual({ 예정일: "2026-11-20" });
    expect(r.skipped).toBe(2);
    expect(skipPendingPlanner(items.slice(0, 1), []).skipped).toBe(0);
    expect(plannerKey(null, "x")).toBe("\nx");
    expect(PLANNER_ROWS_LIMIT).toBe(50);
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

// 2026-11-15 자동화 실행 기록 한국어 표시(화면 함수 — 순수)
import { runMessageKo } from "@/litpage/web/features/database/automations/runMessageKo.ts";
describe("자동화 실행 기록 한국어", () => {
  it("완료·실패·건너뜀과 웹훅 실패 사유를 한국어로, 모르는 문구는 그대로", () => {
    expect(runMessageKo("Completed")).toBe("완료");
    expect(runMessageKo("Failed")).toBe("실패");
    expect(runMessageKo("hooks.example.com returned HTTP 500")).toBe("hooks.example.com이(가) 오류로 응답했습니다(HTTP 500)");
    expect(runMessageKo("Could not reach hooks.example.com")).toBe("hooks.example.com에 연결하지 못했습니다");
    expect(runMessageKo("Webhook request timed out")).toBe("웹훅 응답 시간이 초과됐습니다");
    expect(runMessageKo("카카오톡 알림을 보내지 못했습니다: 키가 없습니다")).toBe("카카오톡 알림을 보내지 못했습니다: 키가 없습니다");
    expect(runMessageKo("constructor")).toBe("constructor");
  });
});
