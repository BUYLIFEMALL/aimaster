import "server-only";
import { UserError } from "@/lib/errors";
import { getItem, type Kind, type Item } from "@/lib/store";

export interface Ctx { userId: string; body: Record<string, unknown> }
export type Handler = (ctx: Ctx) => Promise<unknown>;

export const s = (v: unknown, max = 200) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "");
export const arr = (v: unknown, maxItems = 20, maxLen = 100) => (Array.isArray(v) ? v.map((x) => s(x, maxLen)).filter(Boolean).slice(0, maxItems) : []);

export async function need<T>(userId: string, id: unknown, kind: Kind): Promise<Item<T>> {
  const item = typeof id === "string" ? await getItem<T>(userId, id, kind) : null;
  if (!item) throw new UserError(404, "저장된 작업을 찾지 못했습니다. 목록을 새로 고친 뒤 다시 선택해 주세요.");
  return item;
}
