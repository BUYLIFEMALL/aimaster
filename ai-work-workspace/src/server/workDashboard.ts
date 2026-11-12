// U10 마무리(2026-11-13): 「📊 업무 현황판」 — 콘텐츠 캘린더·받은 업무 표·할 일을 한 페이지에서 본다.
// 템플릿은 회원마다 다른 표를 가리킬 수 없어서 서버 명령으로 만든다:
//  · 📅 콘텐츠 캘린더 / 📨 받은 업무 표 = 회원의 기존 표를 가리키는 「연결 보기」(원래 표의 보기를 복사, 데이터는 원래 표)
//  · ✅ 할 일 = 현황판 안의 새 표(상태·마감일·우선순위)
// 한 번 만든 현황판은 회원 설정(aww_work_dashboard)에 기억해 다시 누르면 그 페이지를 연다.
import "server-only";
import { newId } from "#shared/ids.ts";
import type { Operation } from "#shared/ops.ts";
import type { RichText } from "#shared/richtext.ts";
import type { BlockRecord, CollectionViewRecord, SpaceRecord } from "#shared/records.ts";
import { getRecord } from "@/litpage/server/db.ts";
import { applyTransactions } from "@/litpage/server/records.ts";
import { OpsBuilder, dayOffset, type Spec } from "@/litpage/server/content/spec.ts";
import { spaceViewOf } from "@/litpage/server/ai/edit.ts";

export const DASHBOARD_SETTINGS_KEY = "aww_work_dashboard";
export const DASHBOARD_TITLE = "📊 업무 현황판";

const H2 = (s: string): Spec => ({ type: "sub_header", text: s });
const T = (s: string | RichText): Spec => ({ type: "text", text: s });
const link = (label: string, href: string): RichText => [[label, [["a", href]]]];

/** 원래 표(데이터베이스 블록)를 가리키는 연결 보기 블록 + 보기 복사 작업들 */
export function linkedViewOps(source: BlockRecord, blockId: string, pageId: string, spaceId: string, userId: string, now = Date.now()): Operation[] {
  const collectionId = String(source.collection_id ?? "");
  const pointer = { id: collectionId, table: "collection", spaceId };
  const meta = {
    space_id: spaceId, alive: true,
    created_time: now, created_by_id: userId, created_by_table: "lit_user",
    last_edited_time: now, last_edited_by_id: userId, last_edited_by_table: "lit_user",
  };
  const ops: Operation[] = [];
  const viewIds: string[] = [];
  for (const vid of source.view_ids ?? []) {
    const v = getRecord<CollectionViewRecord>("collection_view", vid);
    if (!v || v.alive === false) continue;
    const id = newId();
    viewIds.push(id);
    const { version: _v, ...rest } = v as CollectionViewRecord & { version?: number };
    ops.push({
      pointer: { table: "collection_view", id, spaceId },
      path: [],
      command: "set",
      args: { ...rest, id, parent_id: blockId, parent_table: "block", alive: true, space_id: spaceId, format: { ...(v.format ?? {}), collection_pointer: pointer } },
    });
  }
  ops.push({
    pointer: { table: "block", id: blockId, spaceId },
    path: [],
    command: "set",
    args: { id: blockId, type: "collection_view", collection_id: collectionId, view_ids: viewIds, format: { collection_pointer: pointer }, parent_id: pageId, parent_table: "block", ...meta },
  });
  return ops;
}

/** 현황판 페이지를 「내 페이지」 맨 위에 만든다. calendar·inbox = 원래 표 블록(받은 업무 표는 아직 없을 수 있음) */
export function createDashboard(ctx: { clientId?: string }, userId: string, space: SpaceRecord, calendar: BlockRecord, inbox: BlockRecord | undefined): string {
  const b = new OpsBuilder(space.id, userId);
  const calId = newId();
  const inboxId = newId();
  const children: Spec[] = [
    { type: "callout", icon: "💡", text: [["콘텐츠 캘린더·받은 업무 표·할 일을 한곳에서 봅니다. 위 두 표는 원래 표를 그대로 보여 주는 「연결 보기」라 여기서 고쳐도 원래 표가 바뀝니다. 새로 들어온 항목은 "], ...link("📨 받은 업무", "/inbox"), [" 화면에서 넣으세요."]], format: { block_color: "gray_background" } },
    H2("📅 콘텐츠 캘린더"),
    { type: "text", id: calId, text: "" }, // 아래 연결 보기로 바뀜
    H2("📨 받은 업무 표"),
    inbox
      ? { type: "text", id: inboxId, text: "" }
      : T([["아직 받은 업무 표가 없습니다. "], ...link("📨 받은 업무", "/inbox"), [" 화면에서 항목의 「표에 행으로 넣기」를 한 번 누르면 표가 생기고, 그 뒤 이 현황판을 다시 만들면 여기에 보입니다."]]),
    H2("✅ 할 일"),
    {
      type: "collection_view",
      db: {
        name: "할 일",
        schema: {
          title: { name: "할 일", type: "title" },
          dSta: { name: "상태", type: "status", options: ["할 일", "진행 중", "완료"] },
          dDue: { name: "마감일", type: "date" },
          dPri: { name: "우선순위", type: "select", options: [{ value: "높음", color: "red" }, { value: "보통", color: "yellow" }, { value: "낮음", color: "gray" }] },
        },
        rows: [{ values: { title: "(예시) 이번 주 발행 글 확인하기", dSta: "할 일", dDue: { date: dayOffset(2) }, dPri: "보통" } }],
        views: [
          { type: "board", name: "상태별", groupBy: "dSta", visible: ["dDue", "dPri"] },
          { type: "table", name: "전체", sort: [{ property: "dDue", direction: "ascending" }] },
        ],
      },
    },
  ];
  const pageId = b.block({ type: "page", text: DASHBOARD_TITLE, icon: "📊", children }, space.id, "space");
  const ops = [...b.ops, ...linkedViewOps(calendar, calId, pageId, space.id, userId)];
  if (inbox) ops.push(...linkedViewOps(inbox, inboxId, pageId, space.id, userId));
  const sv = spaceViewOf(userId, space.id);
  if (sv) ops.push({ pointer: { table: "space_view", id: sv.id, spaceId: space.id }, path: ["private_pages"], command: "listBefore", args: { id: pageId } });
  applyTransactions(userId, [{ id: newId(), spaceId: space.id, debug: { userAction: "awwWorkDashboard" }, operations: ops }], ctx.clientId);
  return pageId;
}
