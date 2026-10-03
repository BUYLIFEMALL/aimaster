import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }

  // Base64 인코딩 방어 폴백
  if (!serviceRoleKey.startsWith("eyJ") && /^[A-Za-z0-9+/=]+$/.test(serviceRoleKey)) {
    try {
      const decoded = Buffer.from(serviceRoleKey, "base64").toString("utf-8");
      if (decoded.startsWith("eyJ")) {
        serviceRoleKey = decoded;
      }
    } catch {
      // ignore
    }
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
