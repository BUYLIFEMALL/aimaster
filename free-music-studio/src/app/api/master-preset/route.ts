import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, suggestMastering } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 마스터링 AI 설정 제안(2026-11-09, AI 마스터링 스튜디오 /api/ai-preset을 옮김) — 원하는 소리 글 → 소리 색깔·음량. 회원 본인 키만.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const text = typeof b.prompt === "string" ? b.prompt.trim().slice(0, 400) : "";
  if (text.length < 2) return NextResponse.json({ error: "원하는 소리를 글로 적어 주세요. 예: 피아노가 맑고 보컬이 가까운 잔잔한 발라드" }, { status: 400 });

  const provider = toLyricProvider(b.provider);
  const label = LYRIC_PROVIDERS.find((p) => p.id === provider)!.label;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json({ error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해 주세요.`, needApiKey: true }, { status: 400 });
  }
  try {
    const r = await suggestMastering(provider, apiKey, toLyricModel(provider, b.model), {
      request: text,
      title: typeof b.title === "string" ? b.title.slice(0, 80) : undefined,
      style: typeof b.style === "string" ? b.style.slice(0, 300) : undefined,
      instrumental: b.instrumental === true,
    });
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "설정값을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
