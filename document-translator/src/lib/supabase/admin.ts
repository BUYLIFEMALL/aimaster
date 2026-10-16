import "server-only";
import { createClient } from "@supabase/supabase-js";
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    (process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY_BASE64
      ? Buffer.from(
          process.env.SUPABASE_SERVICE_ROLE_KEY_BASE64,
          "base64",
        ).toString("utf8")
      : "");
  if (!url || !key) throw new Error("회원 저장 설정이 준비되지 않았습니다.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
