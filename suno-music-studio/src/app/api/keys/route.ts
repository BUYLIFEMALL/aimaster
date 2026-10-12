import { createAdminClient } from "@/lib/supabase/admin";
import { guarded } from "@/lib/apiGuard";
import { getRegisteredApiKeys, getUserApiKey } from "@/lib/apiKeys";
import { MODELS, isProvider } from "@/lib/studio/config";
import { AppError, text } from "@/lib/studio/validation";
import { testKey } from "@/lib/studio/ai";
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
      throw new AppError("AI 공급사를 선택해 주세요.");
    const provider = body.provider;
    if (body.action === "test") {
      const model = MODELS.find(
        (m) => m.provider === provider && m.id === body.model,
      );
      if (!model) throw new AppError("테스트할 모델을 선택해 주세요.");
      const key =
        typeof body.key === "string" && body.key.trim()
          ? text(body.key, "API 키", 500)
          : await getUserApiKey(id, provider);
      if (!key) throw new AppError("본인 키를 먼저 등록해 주세요.");
      await testKey(provider, model.id, key, request.signal);
      return { connected: true };
    }
    if (body.action !== "save") throw new AppError("요청이 올바르지 않습니다.");
    const key = text(body.key, "API 키", 500);
    const { error } = await createAdminClient().from("user_api_keys").upsert(
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
        "키를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
        500,
      );
    return { saved: true, registered: await getRegisteredApiKeys(id) };
  });
}
