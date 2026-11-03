import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, writeLyrics } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";
import { DEFAULT_DURATION, DURATIONS } from "@/lib/songs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const theme = typeof b.theme === "string" ? b.theme.trim().slice(0, 300) : "";
  if (!theme) return NextResponse.json({ error: "어떤 노래를 만들지 주제를 적어 주세요." }, { status: 400 });

  // 회원 본인 키만 — 운영자·다른 회원 키로 대신하지 않는다(최상위 규칙).
  const provider = toLyricProvider(b.provider);
  const label = LYRIC_PROVIDERS.find((p) => p.id === provider)!.label;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록하거나 다른 AI를 골라 주세요.`, needApiKey: true },
      { status: 400 }
    );
  }

  const duration = Number(b.duration_sec);
  try {
    const result = await writeLyrics(provider, apiKey, toLyricModel(provider, b.model), {
      theme,
      genre: typeof b.genre === "string" ? b.genre.trim().slice(0, 60) : "",
      mood: typeof b.mood === "string" ? b.mood.trim().slice(0, 60) : "",
      language: b.language === "en" ? "en" : "ko",
      durationSec: (DURATIONS as readonly number[]).includes(duration) ? duration : DEFAULT_DURATION,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "가사를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
