"use server";

// 2026-11-16 threads-auto(MIT) 이식 2단계 — 네이버 브랜드커넥트 링크 → 회원 브라우저 확장이 실제 상품 페이지에서 수집 → 상품 등록.
// 수집은 회원 PC·회원 브라우저에서만(서버가 쇼핑몰을 읽지 않음). 결과는 회원 소유 표 tap_collect_queue(RLS·30일 정리)에만 둔다.
import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { parseNaverBrandLinks, sanitizeCollected, isNaverBrandAffiliateUrl, naverProductIdentity } from "@/lib/naver/brandConnect";
import type { Database } from "@/types/database.types";

export type NaverQueueRow = Pick<
  Database["public"]["Tables"]["tap_collect_queue"]["Row"],
  "id" | "affiliate_url" | "status" | "connect_kind" | "final_url" | "product_name" | "image_urls" | "reviews" | "error" | "product_id" | "created_at"
>;

const COLUMNS = "id, affiliate_url, status, connect_kind, final_url, product_name, image_urls, reviews, error, product_id, created_at";

export async function listNaverQueueAction(): Promise<{ rows?: NaverQueueRow[]; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tap_collect_queue")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { error: error.message };
  return { rows: (data ?? []) as NaverQueueRow[] };
}

/** 줄마다 붙여 넣은 naver.me 링크를 대기열에 넣는다(이미 대기열에 있는 링크는 건너뜀). */
export async function addNaverLinksAction(text: string): Promise<{ added?: number; duplicated?: number; rejected?: string[]; error?: string }> {
  const user = await requireProgramAccess();
  const { links, rejected } = parseNaverBrandLinks(text);
  if (!links.length) return { error: "네이버 브랜드커넥트에서 발급한 https://naver.me/… 링크를 줄마다 하나씩 넣어 주세요.", rejected };
  const supabase = await createClient();
  // 「조회 → 넣기」 대신 DB 고유 제약(회원+링크, 20261117100000)에 맡긴다 — 동시에 두 번 눌러도 한 줄만 들어가고 나머지는 건너뜀(TAP-20261117-02)
  const { data: added, error } = await supabase
    .from("tap_collect_queue")
    .upsert(links.map((affiliate_url) => ({ user_id: user.id, affiliate_url })), { onConflict: "user_id,affiliate_url", ignoreDuplicates: true })
    .select("id");
  if (error) return { error: error.message };
  const addedCount = (added ?? []).length;
  revalidatePath("/products");
  return { added: addedCount, duplicated: links.length - addedCount, rejected };
}

/**
 * 확장이 보낸 수집 결과(또는 확장 오류)를 저장한다. 서버에서 도착 주소·이미지 주소를 다시 검사한다.
 * TAP-20261117-02 수정(WS-20261117-03 K2·K3): 읽은 뒤 그사이 등록이 끝나도 덮어쓰지 않도록, 저장하는 순간에
 * 「등록됨이 아니고 상품이 연결되지 않은 줄」만 바꾼다. 실제로 바뀐 줄이 없으면 지금 상태를 다시 읽어 그대로 돌려준다(거짓 ready 금지).
 */
export async function saveNaverCollectedAction(id: string, raw: unknown, extensionError?: string): Promise<{ status?: string; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: row } = await supabase.from("tap_collect_queue").select("id, status, product_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return { error: "대기열 항목을 찾지 못했습니다." };
  // 상품이 이미 연결된 줄(옛 경로로 상태만 ready로 남은 줄 포함)은 등록된 것으로 본다 — 다시 수집·등록 대상으로 돌리지 않음
  if (row.status === "registered" || row.product_id) return { status: "registered" };
  const now = new Date().toISOString();
  // 쓰는 순간 조건: 등록됨 아님 + 상품 연결 없음. 바뀐 줄을 돌려받아 성공 여부를 판단한다
  const guardedUpdate = async (values: Database["public"]["Tables"]["tap_collect_queue"]["Update"]) => {
    const { data, error } = await supabase
      .from("tap_collect_queue")
      .update(values)
      .eq("id", id)
      .eq("user_id", user.id)
      .neq("status", "registered")
      .is("product_id", null)
      .select("status");
    if (error) return { error: error.message };
    if (data && data.length) return { status: String(data[0].status) };
    // 그사이 등록됐거나 지워짐 — 지금 상태를 그대로 알려 준다
    const { data: now2 } = await supabase.from("tap_collect_queue").select("status, product_id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!now2) return { error: "대기열 항목을 찾지 못했습니다." };
    return { status: now2.product_id ? "registered" : String(now2.status) };
  };
  if (extensionError) {
    return guardedUpdate({ status: "needs_review", error: String(extensionError).slice(0, 300), updated_at: now });
  }
  const c = sanitizeCollected(raw);
  if ("error" in c) {
    return guardedUpdate({ status: "needs_review", error: c.error, updated_at: now });
  }
  const saved = await guardedUpdate({
    status: "ready", error: null, connect_kind: c.kind, final_url: c.finalUrl, product_name: c.productName,
    image_urls: c.imageUrls, reviews: c.reviews, facts: c.facts, updated_at: now,
  });
  if (saved.status === "ready") await logProgramUsage({ userId: user.id, action: "naver_collect_product" });
  return saved;
}

/**
 * 「준비됨」 항목을 상품으로 등록한다(최대 30개). 근거(후기·정보)는 대기열 표에 남고 글 생성 때 product_id로 찾아 쓴다.
 * TAP-20261117-02: 서버가 도착 주소를 naverProductIdentity로 다시 검사한 항목만, 그 검사한 주소와 함께 DB 함수 tap_register_collected에 넘긴다.
 * 함수가 항목마다 「ready → registered 선점 + 상품 넣기 + 상품 번호 기록」을 한 트랜잭션으로 처리 — 동시 두 요청·중간 실패에도 상품은 1건만 생기고,
 * 실패한 항목은 통째로 되돌아가 ready로 남는다. 검사 뒤 대기열 값이 바뀌었으면 그 항목은 건너뛴다.
 */
export async function registerNaverCollectedAction(ids: string[]): Promise<{ inserted?: number; skipped?: number; failed?: number; error?: string }> {
  const user = await requireProgramAccess();
  if (!Array.isArray(ids) || !ids.length) return { error: "등록할 항목을 골라 주세요." };
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("tap_collect_queue")
    .select("id, affiliate_url, final_url, product_name, status")
    .eq("user_id", user.id)
    .in("id", ids.slice(0, 30));
  if (error) return { error: error.message };
  const items: { id: string; final_url: string }[] = [];
  let invalid = 0;
  for (const r of rows ?? []) {
    if (r.status !== "ready" || !r.product_name || !r.final_url) continue;
    // 대기열은 회원 본인이 직접 고칠 수 있는 표라, 등록 직전에 링크·도착 주소를 서버 규칙으로 다시 확인한다(Workspace 함수 재사용)
    if (!isNaverBrandAffiliateUrl(r.affiliate_url) || !naverProductIdentity(r.final_url)) {
      invalid++;
      continue;
    }
    items.push({ id: r.id, final_url: r.final_url });
  }
  if (!items.length) return { inserted: 0, skipped: invalid };
  const { data: result, error: rpcError } = await supabase.rpc("tap_register_collected", { p_items: items });
  if (rpcError) return { error: rpcError.message };
  const r = (result ?? {}) as { inserted?: number; skipped?: number; failed?: number };
  const inserted = r.inserted ?? 0;
  if (inserted) await logProgramUsage({ userId: user.id, action: "register_naver_collected" });
  revalidatePath("/products");
  return { inserted, skipped: (r.skipped ?? 0) + invalid, failed: r.failed ?? 0 };
}

export async function deleteNaverQueueAction(id: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("tap_collect_queue").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/products");
  return {};
}
