import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { AppError, validateCopy } from "@/lib/studio/validation";
import { generateCopy } from "@/lib/studio/services";
import { missingTextKeyMessage, textModelProvider } from "@/lib/studio/textModels";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    const input = validateCopy(body);
    // 2026-11-18 ECOM-20261118-01: 고른 모델의 플랫폼(OpenAI·Claude·Gemini) 본인 키만 — 다른 플랫폼·운영자 키로 대신하지 않는다.
    const provider = textModelProvider(input.model);
    const key = await getUserApiKey(id, provider);
    if (!key) throw new AppError(missingTextKeyMessage(provider));
    return { quotes: await generateCopy(key, input, request.signal) };
  });
}
