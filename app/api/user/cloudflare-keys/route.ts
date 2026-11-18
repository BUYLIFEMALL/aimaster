// 공용 「API 설정」 Cloudflare Workers AI 본인 키 2개 — ECOM-20261118-06.
// 로그인 회원 세션(createClient)으로 본인을 확인하고, DB는 서비스 클라이언트로 본인 user_id·허용 2개 provider에만 접근한다.
// 응답은 등록 여부 boolean만(값·마스킹 0). 규칙·처리는 lib/integrations/cloudflareKeys.ts.
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CF_PROVIDERS, handleCloudflareKeys, type CloudflareKeyDeps } from "@/lib/integrations/cloudflareKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function deps(): CloudflareKeyDeps {
  return {
    async getUserId() {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    },
    async isSuspended(userId) {
      const { data, error } = await createServiceClient().from("profiles").select("is_suspended").eq("id", userId).maybeSingle();
      if (error || !data) return null;
      return Boolean(data.is_suspended);
    },
    store: {
      async select(userId) {
        // 값(api_key)은 읽지 않는다 — provider 이름만.
        const { data, error } = await createServiceClient().from("user_api_keys").select("provider").eq("user_id", userId).in("provider", [...CF_PROVIDERS]);
        return { data, error };
      },
      async upsertPair(userId, rows) {
        // 두 행을 한 문장으로(원자). rows의 user_id는 세션 회원으로 만든 값만 들어온다.
        const { error } = await createServiceClient().from("user_api_keys").upsert(rows.map((r) => ({ ...r, user_id: userId })), { onConflict: "user_id,provider" });
        return { error };
      },
      async deletePair(userId) {
        const { error } = await createServiceClient().from("user_api_keys").delete().eq("user_id", userId).in("provider", [...CF_PROVIDERS]);
        return { error };
      },
    },
  };
}

export const GET = (req: Request) => handleCloudflareKeys("GET", req, deps());
export const POST = (req: Request) => handleCloudflareKeys("POST", req, deps());
export const DELETE = (req: Request) => handleCloudflareKeys("DELETE", req, deps());
