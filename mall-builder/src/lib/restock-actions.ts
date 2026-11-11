"use server";

// 재입고 알림 신청 취소(D16) — 회원 본인(마이페이지) 또는 그 몰 운영자(관리 화면). 권한 검사는 DB 함수가 한다
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cancelRestockAction(slug: string, requestId: string, back: "admin" | "my") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_restock_cancel", { p_request_id: requestId });
  const path = back === "admin" ? `/s/${slug}/admin/restock` : `/s/${slug}/my`;
  revalidatePath(path);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  // 관리 화면은 msg, 마이페이지는 ok 값을 그대로 보여 준다
  const done = encodeURIComponent("재입고 알림 신청을 취소했습니다.");
  redirect(`${path}?ok=${done}&msg=${done}`);
}
