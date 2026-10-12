import { guarded } from "@/lib/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
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
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;
export function POST(request: Request) {
  return guarded(request, async (id, body) => {
    const query = text(body.query, "음악 검색어", 300);
    if (typeof body.useWeb !== "boolean")
      throw new AppError("웹 검색 사용 여부를 확인해 주세요.");
    const b = validateBrief({
      ...record(body.brief),
      concept: query,
      locked: false,
    });
    const key = await getUserApiKey(id, b.provider);
    if (!key) throw new AppError("선택 AI의 본인 API 키를 등록해 주세요.");
    const research: Research | null = body.useWeb
      ? await researchMusic(b.provider, b.model, key, query, request.signal)
      : null;
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
