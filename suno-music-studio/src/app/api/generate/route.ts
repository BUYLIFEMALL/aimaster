import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import {
  AppError,
  validateBrief,
  parseGenerated,
  validateTrack,
} from "@/lib/studio/validation";
import {
  generationTargets,
  assertTargets,
  mergeSong,
} from "@/lib/studio/generation";
import { automaticExclude } from "@/lib/studio/catalog";
import { musicPrompt } from "@/lib/studio/prompt";
import { callModel } from "@/lib/studio/ai";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    if (
      body.action !== "song" &&
      body.action !== "album" &&
      body.action !== "suggest"
    )
      throw new AppError("생성 종류를 선택해 주세요.");
    const b = validateBrief(body.brief);
    if (body.action === "song") assertTargets(b);
    const context =
      body.action === "song" && body.contextTrack
        ? validateTrack(body.contextTrack, false, true)
        : null;
    const key = await getUserApiKey(id, b.provider);
    if (!key)
      throw new AppError("선택한 AI의 본인 API 키를 등록해 주세요.", 400);
    const p = musicPrompt(b, body.action, context);
    const raw = await callModel(
      b.provider,
      b.model,
      key,
      p.system,
      p.user,
      request.signal,
    );
    const result = parseGenerated(
      raw,
      body.action === "album" ? b.count : body.action === "suggest" ? 3 : 1,
      body.action === "song" && !b.instrumental && b.generateLyrics,
      body.action === "song" ? generationTargets(b) : undefined,
    );
    if (
      b.locked &&
      (body.action !== "song" || b.generateStyle) &&
      result.tracks.some((t) => t.style !== b.style)
    )
      throw new AppError(
        "AI가 잠긴 Style을 변경했습니다. 기존 결과는 유지됩니다.",
        502,
      );
    if (b.instrumental && result.tracks.some((t) => t.lyrics.trim()))
      throw new AppError(
        "연주곡에 가사가 포함되어 결과를 적용하지 않았습니다.",
        502,
      );
    result.tracks = result.tracks.map((t) => ({
      ...t,
      exclude: automaticExclude({ ...b, exclude: t.exclude || b.exclude }),
    }));
    if (body.action === "song")
      result.tracks = [mergeSong(context, result.tracks[0], b)];
    return { result };
  });
}
