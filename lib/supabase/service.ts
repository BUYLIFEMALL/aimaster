import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * 서비스 롤 클라이언트 (RLS 우회)
 * 웹훅, 서버 사이드 관리 작업에만 사용
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key);
}
