import { createClient } from "@supabase/supabase-js";

function getServiceRoleKey(): string {
  const direct = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (direct && direct.length > 20) return direct;
  const b64 = process.env.SUPABASE_SERVICE_ROLE_KEY_BASE64;
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf-8").trim();
      if (decoded.length > 20) return decoded;
    } catch {
      // ignore
    }
  }
  return direct || "";
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = getServiceRoleKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
