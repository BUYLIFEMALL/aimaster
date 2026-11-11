"use server";

// 직원 부계정(D22) 대표 동작 — 초대·권한 바꾸기·내보내기·초대 거두기. 대표 검사는 DB 함수(0043)가 한다
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { PERM_GROUPS } from "@/lib/staff";

export type InviteState = { error: string | null; link: string | null; email: string };

const permsFrom = (form: FormData) => Object.fromEntries(PERM_GROUPS.map((g) => [g.key, form.get(`perm_${g.key}`) === "on"]));

/** 초대 링크는 주소창·기록에 남지 않게 화면 상태로만 돌려준다(이때 한 번만 보임) */
export async function inviteStaffAction(slug: string, _prev: InviteState, form: FormData): Promise<InviteState> {
  const email = String(form.get("email") ?? "").trim();
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_staff_invite", { p_store_id: store.id, p_email: email, p_perms: permsFrom(form) });
  if (error) return { error: error.message, link: null, email };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
  revalidatePath(`/s/${slug}/admin/staff`);
  return { error: null, link: `${origin}/invite/${(data as { token: string }).token}`, email: "" };
}

function back(slug: string, error?: string | null, ok?: string): never {
  const base = `/s/${slug}/admin/staff`;
  redirect(error ? `${base}?error=${encodeURIComponent(error)}` : `${base}?ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`);
}

export async function updateStaffAction(slug: string, userId: string, form: FormData) {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const remove = form.get("remove") === "on";
  const { error } = await supabase.rpc("mall_builder_staff_update", { p_store_id: store.id, p_user_id: userId, p_perms: permsFrom(form), p_remove: remove });
  revalidatePath(`/s/${slug}`, "layout");
  back(slug, error?.message, remove ? "직원을 내보냈습니다. 그 계정은 더 이상 관리 화면에 들어올 수 없습니다." : "권한을 바꿨습니다.");
}

export async function revokeInviteAction(slug: string, inviteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_staff_revoke_invite", { p_invite_id: inviteId });
  revalidatePath(`/s/${slug}/admin/staff`);
  back(slug, error?.message, "초대를 거뒀습니다. 그 링크는 더 이상 쓸 수 없습니다.");
}
