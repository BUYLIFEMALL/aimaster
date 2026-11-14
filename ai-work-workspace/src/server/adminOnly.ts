// 관리자(profiles.is_admin) 확인 — 2026-11-14 공개 페이지 관리 화면용
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await (createAdminClient() as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return !!data?.is_admin;
}

/** 회원 번호 → 이메일(관리자 화면 표시용, 최대 200명) */
export async function emailsOf(ids: string[]): Promise<Record<string, string>> {
  const list = [...new Set(ids.filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 200);
  if (!list.length) return {};
  const { data } = await (createAdminClient() as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("profiles").select("id, email").in("id", list);
  return Object.fromEntries(((data ?? []) as { id: string; email: string | null }[]).map((r) => [r.id, r.email ?? ""]));
}
