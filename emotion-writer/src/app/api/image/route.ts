import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError, validateImage } from "@/lib/studio/validation";
import { cloudflareCredentials, generateImage, type CloudflareCredentials } from "@/lib/studio/services";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    const input = validateImage(body);
    let key: string | CloudflareCredentials = "";
    if (input.provider === "gemini") {
      const k = await getUserApiKey(id, "gemini");
      if (!k)
        throw new AppError("나노바나나 배경 생성에는 본인 Gemini API 키 등록이 필요합니다.");
      key = k;
    } else if (input.provider === "openai") {
      const k = await getUserApiKey(id, "openai");
      if (!k)
        throw new AppError("OpenAI 배경 생성에는 본인 OpenAI API 키 등록이 필요합니다.");
      key = k;
    } else if (input.provider === "free") {
      // ECOM-20261118-05: 회원 본인 Cloudflare 계정 ID + 토큰(공용 이름, 문서 챗봇과 같은 칸). 다른 키로 대신하지 않는다.
      // 이 프로그램 제공사 목록(PROVIDERS) 밖의 공용 이름이라, 회원 본인 행(user_id)만 서버에서 직접 읽는다.
      const { data, error } = await createAdminClient()
        .from("user_api_keys")
        .select("provider,api_key")
        .eq("user_id", id)
        .in("provider", ["cloudflare_workers_ai_token", "cloudflare_account_id"]);
      if (error) throw new AppError("본인 API 키를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
      const pick = (p: string) => data?.find((r) => r.provider === p)?.api_key ?? null;
      key = cloudflareCredentials(pick("cloudflare_workers_ai_token"), pick("cloudflare_account_id"));
    }
    return { image: await generateImage(key, input, request.signal) };
  });
}
