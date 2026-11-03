import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, writeLyrics } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";
import { cleanBannedWords } from "@/lib/lyricRules";
import { DEFAULT_DURATION, DURATIONS, LIMITS } from "@/lib/songs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 초안·다듬기·금지어 고치기까지 최대 4번 호출(한 번 70초 제한)
export const maxDuration = 300;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const mode = b.mode === "edit" ? "edit" : "create";
  const theme = str(b.theme, 300);
  const current =
    mode === "edit" && b.current && typeof b.current === "object"
      ? (() => {
          const c = b.current as Record<string, unknown>;
          return { title: str(c.title, LIMITS.title), style_prompt: str(c.style_prompt, LIMITS.style), lyrics: str(c.lyrics, LIMITS.lyrics) };
        })()
      : undefined;
  if (mode === "create" && !theme) return NextResponse.json({ error: "어떤 노래를 만들지 주제를 적어 주세요." }, { status: 400 });
  if (mode === "edit" && !current?.lyrics) return NextResponse.json({ error: "다듬을 가사가 없습니다. 가사 칸을 먼저 채워 주세요." }, { status: 400 });

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
      mode,
      theme: theme || "자연스럽게 노래로 불리도록 다듬기",
      genre: str(b.genre, 60),
      mood: str(b.mood, 60),
      language: b.language === "en" ? "en" : "ko",
      durationSec: (DURATIONS as readonly number[]).includes(duration) ? duration : DEFAULT_DURATION,
      refine: b.refine !== false,
      bannedWords: cleanBannedWords(b.banned_words),
      recentTitles: (Array.isArray(b.recent_titles) ? b.recent_titles : []).map((t) => str(t, LIMITS.title)).filter(Boolean).slice(0, 10),
      current,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "가사를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
