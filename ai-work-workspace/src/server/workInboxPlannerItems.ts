// U8-B 워크스페이스 → AI 할 일 플래너(플랜 docs/PLAN_20261025_U8B_TO_PLANNER.md): 페이지에서 보낼 할 일을 뽑는
// 순수 함수(DB 연결 없음 — 시험에서 바로 불러 씀). 기록 읽기는 get 함수로 받는다.
import { toPlainText, type RichText } from "#shared/richtext.ts";
import type { BlockRecord, CollectionRecord } from "#shared/records.ts";

export const PLANNER_TODO_LIMIT = 30;
export interface PlannerTask {
  title: string;
  data: Record<string, string>;
}
type Get = (id: string) => BlockRecord | undefined;

function oneLine(rt: RichText | undefined): string {
  return toPlainText(rt).replace(/\s+/g, " ").trim().slice(0, 200);
}

/** 페이지 안의 체크 안 된 할 일(to_do) — 하위 페이지·표 안으로는 들어가지 않음, 최대 PLANNER_TODO_LIMIT개 */
export function uncheckedTodos(get: Get, page: BlockRecord, limit = PLANNER_TODO_LIMIT): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (ids: string[] | undefined) => {
    for (const id of ids ?? []) {
      if (out.length >= limit || seen.has(id)) return;
      seen.add(id);
      const b = get(id);
      if (!b || b.alive === false || b.type === "page" || b.type === "collection_view_page" || b.type === "collection_view") continue;
      if (b.type === "to_do" && b.properties?.checked?.[0]?.[0] !== "Yes") {
        const t = oneLine(b.properties?.title);
        if (t) out.push(t);
        if (out.length >= limit) return;
      }
      walk(b.content);
    }
  };
  walk(page.content);
  return out;
}

const PRIORITY = new Set(["높음", "보통", "낮음"]);
const DATE_NAME = /마감|예정|기한|날짜|due|date/i;

/** 페이지 하나 → 할 일 하나. 표 행 페이지면 날짜 속성(이름에 마감·예정·기한·날짜가 든 것 우선)과 우선순위(높음·보통·낮음)를 함께 */
export function pageAsTask(page: BlockRecord, collection?: CollectionRecord): PlannerTask {
  const title = oneLine(page.properties?.title) || "제목 없는 페이지";
  const data: Record<string, string> = {};
  if (collection && page.parent_table === "collection") {
    const entries = Object.entries(collection.schema ?? {});
    // 예정일 찾는 순서: ① 이름이 맞는 날짜 칸 ② 이름이 맞는 글자 칸(CSV로 만든 표는 「2026-10-30」이 글자로 들어 있음) ③ 다른 날짜 칸
    const named = entries.filter(([, s]) => DATE_NAME.test(s.name));
    const candidates: [string, "date" | "text"][] = [
      ...named.filter(([, s]) => s.type === "date").map(([id]) => [id, "date"] as [string, "date"]),
      ...named.filter(([, s]) => s.type === "text").map(([id]) => [id, "text"] as [string, "text"]),
      ...entries.filter(([, s]) => s.type === "date" && !DATE_NAME.test(s.name)).map(([id]) => [id, "date"] as [string, "date"]),
    ];
    for (const [id, kind] of candidates) {
      const rt = page.properties?.[id] as RichText | undefined;
      const d = kind === "date" ? dateOf(rt) : /^\d{4}-\d{2}-\d{2}$/.test(oneLine(rt)) ? oneLine(rt) : null;
      if (d) { data["예정일"] = d; break; }
    }
    // 우선순위는 선택·상태 칸뿐 아니라 글자 칸(CSV로 만든 표)도 읽는다
    for (const [id, s] of entries) {
      if (s.type !== "select" && s.type !== "status" && s.type !== "text") continue;
      const v = oneLine(page.properties?.[id] as RichText | undefined);
      if (PRIORITY.has(v)) { data["우선순위"] = v; break; }
    }
  }
  return { title, data };
}

function dateOf(rt: RichText | undefined): string | null {
  for (const d of rt ?? []) {
    for (const a of d[1] ?? []) {
      if (a[0] === "d") {
        const v = (a[1] as { start_date?: string })?.start_date;
        if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      }
    }
  }
  return null;
}
