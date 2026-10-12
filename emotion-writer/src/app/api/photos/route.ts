import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { RATIOS, type Ratio } from "@/lib/studio/config";
import { AppError, text } from "@/lib/studio/validation";
import { photoDataUrl, searchPhotos } from "@/lib/studio/services";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    if (body.action === "download")
      return {
        image: await photoDataUrl(
          text(body.url, "이미지 주소", 2000),
          request.signal,
        ),
      };
    if (!["pixabay", "pexels"].includes(String(body.provider)))
      throw new AppError("사진 제공처를 선택해 주세요.");
    if (!RATIOS.includes(body.ratio as Ratio))
      throw new AppError("이미지 비율을 선택해 주세요.");
    const provider = body.provider as "pixabay" | "pexels";
    const query = text(body.query, "검색어", 100);
    const key = await getUserApiKey(id, provider);
    if (!key)
      throw new AppError(
        `${provider === "pixabay" ? "Pixabay" : "Pexels"} 본인 API 키 등록이 필요합니다.`,
      );
    return {
      photos: await searchPhotos(
        provider,
        key,
        query,
        body.ratio as Ratio,
        request.signal,
      ),
    };
  });
}
