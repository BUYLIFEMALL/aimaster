import type { User } from "@supabase/supabase-js";
import type { Member } from "./runtime";

/** Supabase 회원 → 원본 사용자. id는 Supabase 회원 id를 그대로 쓴다(회원별 데이터 격리 기준). */
export function memberFromUser(user: User): Member {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  const name = String(meta.full_name ?? meta.name ?? meta.nickname ?? "").trim() || email.split("@")[0] || "회원";
  return { id: user.id, email, name };
}
