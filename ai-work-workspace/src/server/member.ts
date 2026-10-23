import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Member } from "./runtime";

/**
 * Supabase 회원 → 원본 사용자. id는 Supabase 회원 id를 그대로 쓴다(회원별 데이터 격리 기준).
 * 이름은 메인 사이트에 보이는 프로필 이름(profiles.name)을 쓴다 — 로그인 정보(user_metadata)의 이름은
 * 프로필과 다를 수 있다(2026-10-24 테스트 계정에서 확인). 처음 사용자 레코드를 만들 때만 읽는다(resolveName).
 */
export function memberFromUser(user: User): Member {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  const fallback = String(meta.full_name ?? meta.name ?? meta.nickname ?? "").trim() || email.split("@")[0] || "회원";
  return {
    id: user.id,
    email,
    name: fallback,
    async resolveName() {
      try {
        const { data } = await createAdminClient().from("profiles").select("name").eq("id", user.id).maybeSingle();
        const name = typeof data?.name === "string" ? data.name.trim() : "";
        return name || fallback;
      } catch {
        return fallback;
      }
    },
  };
}
