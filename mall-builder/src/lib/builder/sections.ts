// 디자인 빌더 E3 — 「내 섹션」: 첫 화면 블록 묶음을 이름 붙여 저장하고 다른 때·다른 몰 편집기에서 다시 넣는다(2026-11-15)
// 플랜: docs/PLAN_20261115_MY_SECTIONS.md · DB: supabase/migrations/0095_mall_builder_sections.sql(회원 본인 소유, 계속 보관)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { validateDoc, type Block } from "../blocks.ts";

export const MAX_SECTIONS = 30; // 회원당(DB 함수도 같은 값으로 막음)
export const MAX_SECTION_BLOCKS = 10;
export const MAX_SECTION_NAME = 40;
export const MAX_SECTION_BYTES = 20000; // 첫 화면 저장 한도와 같음

export type MySection = { id: string; name: string; blocks: Block[]; source_store_id: string | null; created_at: string };

/** 저장 전 검사 — 블록은 첫 화면과 같은 검사(validateDoc)를 통과해야 한다 */
export function validateSection(name: unknown, blocks: unknown): { ok: true; value: { name: string; blocks: Block[] } } | { ok: false; error: string } {
  const n = typeof name === "string" ? name.trim().slice(0, MAX_SECTION_NAME) : "";
  if (!n) return { ok: false, error: "섹션 이름을 넣어 주세요." };
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return { ok: false, error: "저장할 블록을 1개 이상 골라 주세요." };
  if (list.length > MAX_SECTION_BLOCKS) return { ok: false, error: `섹션 하나에는 블록 ${MAX_SECTION_BLOCKS}개까지 담을 수 있습니다.` };
  const v = validateDoc({ blocks: list });
  if (!v.ok) return v;
  if (JSON.stringify(v.value.blocks).length > MAX_SECTION_BYTES) return { ok: false, error: "섹션 내용이 너무 큽니다. 블록 수를 줄여 주세요." };
  return { ok: true, value: { name: n, blocks: v.value.blocks } };
}

const hex12 = () => (globalThis.crypto?.randomUUID?.() ?? `${Math.random()}${Date.now()}`).replace(/[^0-9a-f]/g, "").padEnd(12, "0").slice(0, 12);
const NEW_SOURCE = { source: "new", category_id: "", product_ids: [] as string[] };
const hasOwnSource = (s: Record<string, unknown>) => s.source === "manual" || s.source === "category";

/**
 * 편집기에 넣을 블록 만들기 — 번호는 늘 새로(지금 첫 화면과 안 겹치게).
 * 다른 몰이면 그 몰에 없는 상품·카테고리 번호를 쓰지 않게 출처를 「신상품」으로 바꾸고, 카테고리 바로가기는 뺀다(2~12개를 그 몰에서 골라야 저장됨).
 */
export function prepareInsert(blocks: Block[], opt: { sameStore: boolean; existingIds: string[] }): { blocks: Block[]; notes: string[] } {
  const used = new Set(opt.existingIds);
  const out: Block[] = [];
  let reset = 0;
  let dropped = 0;
  for (const b of blocks) {
    if (!opt.sameStore && b.type === "category_icons") { dropped++; continue; }
    let settings = structuredClone(b.settings) as unknown as Record<string, unknown>;
    if (!opt.sameStore) {
      if (hasOwnSource(settings)) { settings = { ...settings, ...NEW_SOURCE }; reset++; }
      if (Array.isArray(settings.tabs)) {
        const tabs = (settings.tabs as Record<string, unknown>[]).map((t) => (hasOwnSource(t) ? (reset++, { ...t, ...NEW_SOURCE }) : t));
        settings = { ...settings, tabs };
      }
    }
    let id = "";
    do id = `${b.type}-${hex12()}`; while (used.has(id));
    used.add(id);
    out.push({ ...structuredClone(b), id, settings } as Block);
  }
  const notes: string[] = [];
  if (reset) notes.push(`다른 몰에서 만든 섹션이라 상품·카테고리를 고른 칸 ${reset}곳을 「신상품」으로 바꿨습니다. 필요하면 이 몰 상품으로 다시 골라 주세요.`);
  if (dropped) notes.push(`카테고리 바로가기 블록 ${dropped}개는 이 몰 카테고리를 새로 골라야 해서 넣지 않았습니다.`);
  return { blocks: out, notes };
}
