import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { AppError, validateImage } from "@/lib/studio/validation";
import { generateImage } from "@/lib/studio/services";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    const input = validateImage(body);
    const key = await getUserApiKey(id, "gemini");
    if (!key)
      throw new AppError("배경 생성에는 본인 Gemini API 키 등록이 필요합니다.");
    return { image: await generateImage(key, input, request.signal) };
  });
}
