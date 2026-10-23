import { createAdminClient } from "@/lib/supabase/admin";
import { guarded } from "@/lib/apiGuard";
import { getRegisteredApiKeys, getUserApiKey } from "@/lib/apiKeys";
import { isProvider } from "@/lib/studio/config";
import { AppError, text } from "@/lib/studio/validation";
import { searchPhotos } from "@/lib/studio/services";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export function GET(request: Request) {
  return guarded(request, async (id) => ({
    registered: await getRegisteredApiKeys(id),
  }));
}
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    if (!isProvider(body.provider))
      throw new AppError("지원하는 API를 선택해 주세요.");
    const provider = body.provider;
    if (body.action === "test") {
      const key =
        typeof body.key === "string" && body.key.trim()
          ? text(body.key, "API 키", 500)
          : await getUserApiKey(id, provider);
      if (!key) throw new AppError("본인 API 키를 먼저 등록해 주세요.");
      if (provider === "gemini") {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash",
          {
            headers: { "x-goog-api-key": key },
            cache: "no-store",
            signal: AbortSignal.any([
              request.signal,
              AbortSignal.timeout(15000),
            ]),
          },
        );
        if (!res.ok)
          throw new AppError("Gemini 키와 모델 사용 권한을 확인해 주세요.");
      } else await searchPhotos(provider, key, "nature", "1:1", request.signal);
      return { connected: true };
    }
    if (body.action !== "save") throw new AppError("요청이 올바르지 않습니다.");
    const key = text(body.key, "API 키", 500);
    const { error } = await createAdminClient()
      .from("user_api_keys")
      .upsert(
        {
          user_id: id,
          provider,
          api_key: key,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
    if (error)
      throw new AppError(
        "키를 저장하지 못했습니다. 프로그램 연동 설정을 확인해 주세요.",
        500,
      );
    return { saved: true, registered: await getRegisteredApiKeys(id) };
  });
}
