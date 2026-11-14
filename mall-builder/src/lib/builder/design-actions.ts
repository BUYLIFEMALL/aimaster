"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStoreStaff } from "@/lib/store";
import { validateDoc } from "@/lib/blocks";
import { readTheme, validateTheme } from "@/lib/theme";
import { validateFooter, validateHeader, validatePopup } from "@/lib/builder/frame";
import { validateDetail, validateList } from "@/lib/builder/pages";
import { designPolicy, enforceFooter } from "@/lib/builder/policy";
import { currentDraftStamp, recordPublished } from "@/lib/builder/design-store";
import { isStale, latestStamp } from "@/lib/builder/history";
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
/** 디자인 저장 결과 — base: 저장 뒤 마지막 초안 시각(편집기가 다음 저장 때 비교), conflict: 다른 곳에서 먼저 저장함(D6-3) */
type SaveResult = { ok: true; at: string; base: string | null } | { ok: false; error: string; conflict?: { at: string } };

/** D6 게시 기록 한 줄을 「초안」으로 되돌리기 — 손님 화면은 운영자가 편집기에서 확인하고 게시해야 바뀐다 */
export async function restoreDesignAction(slug: string, storeId: string, historyId: string): Promise<Result> {
  if (!/^[0-9a-f-]{36}$/i.test(historyId)) return { ok: false, error: "게시 기록을 찾지 못했습니다." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_design_restore", { p_store_id: storeId, p_history_id: historyId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/s/${slug}/admin/design`);
  return { ok: true, at: data as string };
}

/** D3 첫 화면 블록 + 몰 테마·헤더·바닥글·팝업을 함께 초안 저장(publish면 이어서 모두 게시). 하나라도 검사에 걸리면 아무것도 저장하지 않는다 */
export async function saveDesignAction(slug: string, storeId: string, input: { home: unknown; theme: unknown; header?: unknown; footer?: unknown; popup?: unknown; list?: unknown; detail?: unknown; expect?: string | null; force?: boolean }, publish: boolean): Promise<SaveResult> {
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
  const list = validateList(input.list ?? {});
  if (!list.ok) return { ok: false, error: `상품 목록: ${list.error}` };
  const detail = validateDetail(input.detail ?? {});
  if (!detail.ok) return { ok: false, error: `상품 상세: ${detail.error}` };
  const supabase = await createClient();
  // D5-4 몰 종류별 잠금 — 화면을 우회해 보내도 잠긴 칸은 정책 값으로 저장
  const { data: storeRow } = await supabase.from("mall_builder_stores").select("kind").eq("id", storeId).maybeSingle();
  const policy = designPolicy({ kind: (storeRow as { kind?: string } | null)?.kind ?? null });
  const footerValue = enforceFooter(policy, footer.value);
  // D6-3 편집기를 연 뒤 다른 곳에서 먼저 저장했으면 덮어쓰지 않고 알림(운영자가 「그래도 덮어쓰기」를 고르면 force)
  if (input.expect !== undefined && !input.force) {
    const current = await currentDraftStamp(supabase, storeId);
    if (isStale(input.expect, current)) return { ok: false, error: "다른 곳(다른 직원이나 다른 창)에서 먼저 저장했습니다.", conflict: { at: current! } };
  }
  const stamps: string[] = [];
  const a = await supabase.rpc("mall_builder_save_page_draft", { p_store_id: storeId, p_doc: home.value });
  if (a.error) return { ok: false, error: a.error.message };
  stamps.push(a.data as string);
  const b = await supabase.rpc("mall_builder_design_save_draft", { p_store_id: storeId, p_kind: "theme", p_doc: theme });
  if (b.error) return { ok: false, error: b.error.message };
  stamps.push(b.data as string);
  for (const [kind, doc] of [["header", header.value], ["footer", footerValue], ["popup", popup.value], ["list", list.value], ["detail", detail.value]] as const) {
    const r = await supabase.rpc("mall_builder_design_save_draft", { p_store_id: storeId, p_kind: kind, p_doc: doc });
    if (r.error) return { ok: false, error: r.error.message };
    stamps.push(r.data as string);
  }
  let at = a.data as string;
  if (publish) {
    const c = await supabase.rpc("mall_builder_publish_page", { p_store_id: storeId });
    if (c.error) return { ok: false, error: c.error.message };
    const d = await supabase.rpc("mall_builder_design_publish", { p_store_id: storeId, p_kinds: ["theme", "header", "footer", "popup", "list", "detail"] });
    if (d.error) return { ok: false, error: d.error.message };
    at = c.data as string;
    await recordPublished(supabase, storeId);
    revalidatePath(`/s/${slug}`, "layout");
  }
  revalidatePath(`/s/${slug}/admin/design`);
  return { ok: true, at, base: latestStamp(stamps) };
}
