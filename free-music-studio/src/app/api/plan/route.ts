import { NextResponse } from "next/server";
import { toLyricLanguage } from "@/lib/lyricLanguages";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, planInstrumentals } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";
import { PLAN_MAX, PLAN_TOTAL_MAX, cleanBannedWords } from "@/lib/lyricRules";
import { DEFAULT_DURATION, MUSIC_DURATIONS as DURATIONS, LIMITS } from "@/lib/songs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;

// AI 작곡 기획 — 연주곡 여러 곡의 제목·스타일·앨범 설명을 한 번에(곡마다 다르게). 회원 본인 키만.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const theme = typeof b.theme === "string" ? b.theme.trim().slice(0, 300) : "";
  if (!theme) return NextResponse.json({ error: "어떤 연주곡을 만들지 주제를 적어 주세요." }, { status: 400 });
  const count = Math.min(PLAN_MAX, Math.max(1, Math.floor(Number(b.count) || 1)));

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
    const result = await planInstrumentals(provider, apiKey, toLyricModel(provider, b.model), {
      theme,
      style: typeof b.style === "string" ? b.style.trim().slice(0, LIMITS.style) : "",
      count,
      durationSec: (DURATIONS as readonly number[]).includes(duration) ? duration : DEFAULT_DURATION,
      bannedWords: cleanBannedWords(b.banned_words),
      language: toLyricLanguage(b.language),
      // 나눠 기획할 때 앞 묶음 제목(겹침 방지)과 「21-40 of 40」 표시 — 화면이 보낸다
      used: Array.isArray(b.used) ? b.used.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, LIMITS.title)).slice(0, PLAN_TOTAL_MAX) : [],
      batch: typeof b.batch === "string" ? b.batch.slice(0, 40) : undefined,
      // 연주곡 장르(2026-11-09) — 화면이 「대분류 · 세부 (영어 태그)」로 보낸다
      genre: typeof b.genre === "string" ? b.genre.trim().slice(0, 80) : "",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 곡 수를 줄여 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "연주곡을 기획하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
