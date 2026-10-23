// 정밀 기획 스튜디오 API (2026-10-21 병합 M1, 옛 suno-music-studio에서 가져옴 — 화면은 /studio)
import { guarded, requireStudioKey } from "@/lib/studioApiGuard";
import {
  validateBrief,
  text,
  AppError,
  parseGenerated,
  record,
} from "@/lib/studio/validation";
import { musicPrompt } from "@/lib/studio/prompt";
import { callModel } from "@/lib/studio/ai";
import { researchMusic, type Research } from "@/lib/studio/research";
import { recordingPrompt, parseRecordings } from "@/lib/studio/recordings";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    const query = text(body.query, "음악 검색어", 300);
    const mode = body.mode ?? "planning";
    if (typeof mode !== "string" || !["planning", "recordings"].includes(mode))
      throw new AppError("검색 종류를 확인해 주세요.");
    if (typeof body.useWeb !== "boolean")
      throw new AppError("웹 검색 사용 여부를 확인해 주세요.");
    if (mode === "recordings" && !body.useWeb)
      throw new AppError("대표곡 참고는 출처를 위해 웹 검색이 필요합니다.");
    const b = validateBrief({
      ...record(body.brief),
      concept: query,
      locked: false,
    });
    const key = await requireStudioKey(id, b.provider);
    const research: Research | null = body.useWeb
      ? await researchMusic(
          b.provider,
          b.model,
          key,
          query,
          request.signal,
          fetch,
          mode === "recordings" ? "recordings" : "properties",
        )
      : null;
    if (mode === "recordings" && research) {
      const raw = await callModel(
        b.provider,
        b.model,
        key,
        recordingPrompt(),
        JSON.stringify({
          query,
          research: research.text,
          sources: research.sources,
        }),
        request.signal,
      );
      return {
        result: { tracks: [] },
        recordingResult: parseRecordings(raw, research),
        research,
        usedWeb: true,
      };
    }
    const p = musicPrompt(b, "search");
    const raw = await callModel(
      b.provider,
      b.model,
      key,
      p.system,
      JSON.stringify({ query, brief: b, reference: research?.text || null }),
      request.signal,
    );
    const result = parseGenerated(raw, 6, false);
    return { result, research, usedWeb: Boolean(research) };
  });
}
