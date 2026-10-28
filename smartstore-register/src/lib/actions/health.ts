"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { HealthStatus } from "@/lib/smartstore/health";

// 판매자센터 화면 점검 — 회원 확장이 읽기만 한다. 권한 확인 + 본인 행만(RLS owner).

export type HealthView = { id: string; status: HealthStatus; missing: string[]; conditional: string[]; storeName: string | null; error: string | null; at: string };

export async function requestHealthCheckAction(): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: active } = await supabase.from("smartstore_register_health").select("id").eq("user_id", user.id).in("status", ["queued", "running"]).limit(1).maybeSingle();
  if (!active) {
    const { error } = await supabase.from("smartstore_register_health").insert({ user_id: user.id });
    if (error) return { error: "점검 요청을 만들지 못했습니다." };
  }
  revalidatePath("/home");
  return { ok: true };
}

export async function getLatestHealthAction(): Promise<HealthView | null> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("smartstore_register_health")
    .select("id,status,missing,conditional,store_name,error,updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return { id: data.id, status: data.status, missing: arr(data.missing), conditional: arr(data.conditional), storeName: data.store_name, error: data.error, at: data.updated_at };
}
