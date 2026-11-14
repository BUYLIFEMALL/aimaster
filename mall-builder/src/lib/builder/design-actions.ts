"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStoreStaff } from "@/lib/store";
import { validateDoc } from "@/lib/blocks";
import { readTheme, validateTheme } from "@/lib/theme";
import { validateFooter, validateHeader, validatePopup } from "@/lib/builder/frame";
import { loadSlotData } from "@/lib/builder/slot-data";
import type { SlotData } from "@/app/s/[store]/home-slots";

// 디자인 빌더 — 편집기(클라이언트)에서 바로 부르는 서버 액션. 이동하지 않고 결과를 돌려준다
// 운영자 확인은 DB 함수(mall_builder_is_store_staff)가 한 번 더 한다

/** D2-5 편집기 미리보기용 블록 데이터(읽기만). 운영자만, 블록은 저장 검사를 통과한 것만 */
export async function previewSlotAction(storeId: string, block: unknown): Promise<{ ok: true; data: SlotData } | { ok: false; error: string }> {
  if (!(await isStoreStaff(storeId))) return { ok: false, error: "이 몰을 고칠 권한이 없습니다." };
  const v = validateDoc({ blocks: [block] });
  if (!v.ok) return { ok: false, error: v.error };
  return { ok: true, data: await loadSlotData(storeId, v.value.blocks[0]) };
}

type Result = { ok: true; at: string } | { ok: false; error: string };

/** D3 첫 화면 블록 + 몰 테마·헤더·바닥글·팝업을 함께 초안 저장(publish면 이어서 모두 게시). 하나라도 검사에 걸리면 아무것도 저장하지 않는다 */
export async function saveDesignAction(slug: string, storeId: string, input: { home: unknown; theme: unknown; header?: unknown; footer?: unknown; popup?: unknown }, publish: boolean): Promise<Result> {
  const home = validateDoc(input.home);
  if (!home.ok) return home;
  const themeErrors = validateTheme(input.theme ?? {});
  if (themeErrors.length) return { ok: false, error: themeErrors[0] };
  const theme = readTheme(input.theme);
  const header = validateHeader(input.header ?? {});
  if (!header.ok) return { ok: false, error: `헤더: ${header.error}` };
  const footer = validateFooter(input.footer ?? {});
  if (!footer.ok) return { ok: false, error: `바닥글: ${footer.error}` };
  const popup = validatePopup(input.popup ?? {});
  if (!popup.ok) return { ok: false, error: `팝업: ${popup.error}` };
  const supabase = await createClient();
  const a = await supabase.rpc("mall_builder_save_page_draft", { p_store_id: storeId, p_doc: home.value });
  if (a.error) return { ok: false, error: a.error.message };
  const b = await supabase.rpc("mall_builder_design_save_draft", { p_store_id: storeId, p_kind: "theme", p_doc: theme });
  if (b.error) return { ok: false, error: b.error.message };
  for (const [kind, doc] of [["header", header.value], ["footer", footer.value], ["popup", popup.value]] as const) {
    const r = await supabase.rpc("mall_builder_design_save_draft", { p_store_id: storeId, p_kind: kind, p_doc: doc });
    if (r.error) return { ok: false, error: r.error.message };
  }
  let at = a.data as string;
  if (publish) {
    const c = await supabase.rpc("mall_builder_publish_page", { p_store_id: storeId });
    if (c.error) return { ok: false, error: c.error.message };
    const d = await supabase.rpc("mall_builder_design_publish", { p_store_id: storeId, p_kinds: ["theme", "header", "footer", "popup"] });
    if (d.error) return { ok: false, error: d.error.message };
    at = c.data as string;
    revalidatePath(`/s/${slug}`, "layout");
  }
  revalidatePath(`/s/${slug}/admin/design`);
  return { ok: true, at };
}
