"use server";

// M2-2(2026-11-15) 송장 엑셀 일괄 등록·선택 일괄 상태 변경 — 주문마다 기존 DB 함수 mall_builder_change_order_status를 부른다
// (권한·상태 이동표·송장 필수·분양몰/카드 보호 규칙을 DB가 그대로 검사). 한 주문이 실패해도 나머지는 계속, 줄마다 결과를 돌려준다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BULK_TARGETS, cleanIds, isBulkTarget, parseTrackingSheet, trackingSteps } from "@/lib/order-excel";
import { TRACKING_MAX_BYTES, readTrackingTable } from "@/lib/order-excel-server";

export type TrackingResult = { row: number; orderNo: string; ok: boolean; message: string };
export type TrackingState = { error: string | null; results: TrackingResult[]; done: number };

async function staffStore(slug: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { supabase, error: "몰을 찾을 수 없습니다." as const };
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: store.id, p_perm: "orders" });
  if (can !== true) return { supabase, error: "주문 권한이 없습니다." as const };
  return { supabase, storeId: store.id as string, error: null };
}

export async function trackingUploadAction(slug: string, _prev: TrackingState, form: FormData): Promise<TrackingState> {
  const fail = (error: string): TrackingState => ({ error, results: [], done: 0 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("엑셀 파일을 골라 주세요.");
  if (file.size > TRACKING_MAX_BYTES) return fail("파일이 4MB를 넘습니다. 나눠 올려 주세요.");
  if (!/\.xlsx$/i.test(file.name)) return fail("엑셀(.xlsx) 파일만 올릴 수 있습니다.");
  const s = await staffStore(slug);
  if (s.error !== null) return fail(s.error);

  const table = await readTrackingTable(await file.arrayBuffer());
  if ("error" in table) return fail(table.error);
  const sheet = parseTrackingSheet(table);
  if ("error" in sheet) return fail(sheet.error);
  const results: TrackingResult[] = sheet.errors.map((e) => ({ row: e.row, orderNo: "", ok: false, message: e.message }));
  if (!sheet.lines.length && !results.length) return fail("송장을 채운 줄이 없습니다. 「택배사」「송장번호」 칸을 채워 올려 주세요.");

  // 주문번호 → 주문(이 몰 것만)
  const nos = sheet.lines.map((l) => l.orderNo);
  const found = new Map<string, { id: string; status: string }>();
  for (let i = 0; i < nos.length; i += 200) {
    const { data } = await s.supabase.from("mall_builder_orders").select("id, order_no, status").eq("store_id", s.storeId).in("order_no", nos.slice(i, i + 200));
    for (const o of data ?? []) found.set(o.order_no as string, { id: o.id as string, status: o.status as string });
  }

  let done = 0;
  for (const l of sheet.lines) {
    const o = found.get(l.orderNo);
    if (!o) { results.push({ row: l.row, orderNo: l.orderNo, ok: false, message: "이 몰에 없는 주문번호입니다." }); continue; }
    const plan = trackingSteps(o.status);
    if ("skip" in plan) { results.push({ row: l.row, orderNo: l.orderNo, ok: false, message: plan.skip }); continue; }
    let err: string | null = null;
    for (const to of plan.steps) {
      const { error } = await s.supabase.rpc("mall_builder_change_order_status", {
        p_order_id: o.id, p_to: to, p_note: to === "shipping" ? "송장 엑셀 일괄 등록" : "송장 엑셀 일괄 등록(배송 준비)", p_courier: l.courier, p_tracking: l.tracking,
      });
      if (error) { err = error.message; break; }
    }
    if (err) results.push({ row: l.row, orderNo: l.orderNo, ok: false, message: err });
    else { done++; results.push({ row: l.row, orderNo: l.orderNo, ok: true, message: `${l.courier} ${l.tracking} → 배송 중` }); }
  }
  results.sort((a, b) => a.row - b.row);
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, results, done };
}

/** 목록에서 고른 주문을 한꺼번에 — 입금 확인·배송 준비·배송 완료만(취소·환불은 주문마다) */
export async function bulkStatusAction(slug: string, backQuery: string, form: FormData) {
  const base = `/s/${slug}/admin/orders`;
  const back = (q: string) => redirect(`${base}?${[backQuery.replace(/^\?/, ""), q].filter(Boolean).join("&")}`);
  const to = String(form.get("to") ?? "");
  const ids = cleanIds(form.getAll("ids").map(String));
  if (!isBulkTarget(to)) back(`bulk_error=${encodeURIComponent("바꿀 상태를 골라 주세요.")}`);
  if (!ids.length) back(`bulk_error=${encodeURIComponent("주문을 1건 이상 골라 주세요.")}`);
  const s = await staffStore(slug);
  if (s.error !== null) back(`bulk_error=${encodeURIComponent(s.error)}`);
  const sb = s.supabase;
  let ok = 0;
  const fails: string[] = [];
  for (const id of ids) {
    const { error } = await sb.rpc("mall_builder_change_order_status", { p_order_id: id, p_to: to, p_note: `일괄 ${BULK_TARGETS[to as keyof typeof BULK_TARGETS]}`, p_courier: "", p_tracking: "" });
    if (error) fails.push(error.message);
    else ok++;
  }
  revalidatePath(`/s/${slug}`, "layout");
  // 실패 사유는 같은 문구끼리 묶어 한 줄로(주소 길이 제한)
  const reasons = [...new Set(fails)].slice(0, 3).join(" / ").slice(0, 300);
  back(`bulk_ok=${ok}&bulk_fail=${fails.length}${reasons ? `&bulk_error=${encodeURIComponent(reasons)}` : ""}`);
}
