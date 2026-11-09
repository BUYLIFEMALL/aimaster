import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, writeStyleVariants } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";
import { MULTI_MAX } from "@/lib/multiVersion";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 여러 버전 한 번에 — 버전마다 서로 다른 느낌의 음악 스타일(2026-11-09). 회원 본인 키만, 한 번 호출로 버전 수만큼.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const slots = (Array.isArray(b.slots) ? b.slots : [])
    .slice(0, MULTI_MAX)
    .map((s) => ({ genre: String((s as Record<string, unknown>)?.genre ?? "").slice(0, 40), engine: String((s as Record<string, unknown>)?.engine ?? "").slice(0, 40) }));
  if (slots.length < 2) return NextResponse.json({ error: "버전을 2개 이상 골라 주세요." }, { status: 400 });
  const lyrics = typeof b.lyrics === "string" ? b.lyrics.slice(0, 4000) : "";
  const baseStyle = typeof b.style === "string" ? b.style.slice(0, 1000) : "";
  const tags = typeof b.tags === "string" ? b.tags.slice(0, 300) : "";
  const instrumental = b.instrumental === true;

  const provider = toLyricProvider(b.provider);
  const label = LYRIC_PROVIDERS.find((p) => p.id === provider)!.label;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json({ error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록하거나 다른 AI를 골라 주세요.`, needApiKey: true }, { status: 400 });
  }
  try {
    return NextResponse.json(await writeStyleVariants(provider, apiKey, toLyricModel(provider, b.model), { lyrics, baseStyle, tags, instrumental, slots }));
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "버전별 스타일을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
