import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { AppError, validateCopy } from "@/lib/studio/validation";
import { generateCopy } from "@/lib/studio/services";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    const input = validateCopy(body);
    const key = await getUserApiKey(id, "gemini");
    if (!key)
      throw new AppError("글귀 생성에는 본인 Gemini API 키 등록이 필요합니다.");
    return { quotes: await generateCopy(key, input, request.signal) };
  });
}
