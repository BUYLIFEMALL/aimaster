"use server";

// T2 분양몰 서버 동작(0061) — 권한·검사는 DB 함수가 다시 한다. 결과는 돌아갈 화면의 ?error= / ?ok=&msg=
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RESALE_DAYS, isValidSlug } from "@/lib/resale";

function go(path: string, error?: string | null, ok?: string): never {
  const [p, hash] = path.split("#");
  const q = error ? `error=${encodeURIComponent(error)}` : `ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`;
  redirect(`${p}${p.includes("?") ? "&" : "?"}${q}${hash ? `#${hash}` : ""}`);
}
const text = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const days = (form: FormData, k: string, fallback: number) => {
  const n = Number(String(form.get(k) ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && String(form.get(k) ?? "").trim() !== "" ? n : fallback;
};

/** 회원: 분양 신청 */
export async function applyResaleAction(sourceSlug: string, form: FormData) {
  const back = `/resale#apply`;
  const slug = text(form, "slug").toLowerCase();
  if (!isValidSlug(slug)) go(back, "몰 주소는 영문 소문자·숫자·하이픈 3~30자로 입력해 주세요.");
  if (form.get("agree") !== "on") go(back, "분양 안내(정산·결제·이용 기간)를 확인하고 동의해 주세요.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_resale_apply", {
    p_source_slug: sourceSlug,
    p: { slug, name: text(form, "name"), phone: text(form, "phone"), channel: text(form, "channel"), memo: text(form, "memo") },
  });
  revalidatePath("/resale");
  go(back, error?.message, "분양을 신청했습니다. 본사가 확인한 뒤 승인하면 내 분양몰이 열립니다.");
}

/** 회원: 승인 전 신청 취소 */
export async function cancelResaleAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_resale_cancel", { p_id: id });
  revalidatePath("/resale");
  go("/resale#mine", error?.message, "신청을 취소했습니다.");
}

/** 원본 몰 대표: 승인(이용 기간)·반려(사유) */
export async function decideResaleAction(slug: string, id: string, action: "approve" | "reject", form: FormData) {
  const back = `/s/${slug}/admin/resale`;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_resale_decide", {
    p_id: id,
    p_action: action,
    p_days: days(form, "days", DEFAULT_RESALE_DAYS),
    p_note: text(form, "note"),
  });
  revalidatePath(back);
  go(back, error?.message, action === "approve" ? `승인했습니다. 분양몰 /s/${data as string} 이 열렸습니다.` : "반려했습니다. 신청자 화면에 사유가 보입니다.");
}

/** 원본 몰 대표: 이용 기간 바꾸기(오늘부터 N일, 0 = 바로 끝냄) */
export async function setResalePeriodAction(slug: string, storeId: string, form: FormData) {
  const back = `/s/${slug}/admin/resale`;
  const supabase = await createClient();
  const n = days(form, "days", -1);
  if (n < 0) go(back, "이용 기간(일)을 숫자로 적어 주세요.");
  const { error } = await supabase.rpc("mall_builder_resale_set_period", { p_store_id: storeId, p_days: n });
  revalidatePath(back);
  go(back, error?.message, n === 0 ? "이용 기간을 끝냈습니다. 그 분양몰은 새 주문을 받지 않습니다." : `이용 기간을 오늘부터 ${n}일로 바꿨습니다.`);
}

/** 원본 몰 대표: 분양 받기 켜기/끄기 */
export async function setResaleOpenAction(slug: string, storeId: string, open: boolean) {
  const back = `/s/${slug}/admin/resale`;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_resale_set_open", { p_store_id: storeId, p_open: open });
  revalidatePath(back);
  revalidatePath("/resale");
  go(back, error?.message, open ? "분양 신청을 받습니다. 공개 안내 화면(/resale)에 이 몰이 보입니다." : "분양 신청을 받지 않습니다.");
}

// ── T2-2 거울 상품(0062) ──
/** 분양자: 본사 상품 담기(체크한 것, 처음 판매가 = 본사가 × (1 + 인상률%)) */
export async function addResaleProductsAction(slug: string, storeId: string, form: FormData) {
  const back = `/s/${slug}/admin/resale#catalog`;
  const ids = form.getAll("ids").map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v));
  if (!ids.length) go(back, "담을 상품을 골라 주세요.");
  const rate = Number(String(form.get("markup") ?? "0").replace(/[^0-9.]/g, "") || "0");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_resale_add", { p_store_id: storeId, p_source_ids: ids, p_markup: rate });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, `${data ?? 0}개를 담았습니다. 아래 「내 분양 상품」에서 판매가를 고칠 수 있습니다.`);
}

/** 분양자: 판매가 정하기(본사가 이상) */
export async function setResalePriceAction(slug: string, productId: string, form: FormData) {
  const back = `/s/${slug}/admin/resale#mine`;
  const price = Number(String(form.get("price") ?? "").replace(/[^0-9]/g, ""));
  if (!price) go(back, "판매가를 숫자로 적어 주세요.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_resale_price", { p_product_id: productId, p_price: price });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, "판매가를 저장했습니다.");
}

/** 분양자: 빼기 */
export async function removeResaleProductAction(slug: string, productId: string) {
  const back = `/s/${slug}/admin/resale#mine`;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_resale_remove", { p_product_id: productId });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, data === "hidden" ? "주문 기록이 있어 지우지 않고 숨겼습니다." : "뺐습니다.");
}
