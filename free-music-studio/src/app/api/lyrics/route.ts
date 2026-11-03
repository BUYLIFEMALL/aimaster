import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { writeLyrics } from "@/lib/ai/lyrics";
import { toLyricModel } from "@/lib/lyricModels";
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
  const apiKey = await getUserApiKey(access.user.id, "anthropic");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해 주세요.", needApiKey: true },
      { status: 400 }
    );
  }

  const duration = Number(b.duration_sec);
  try {
    const result = await writeLyrics(apiKey, toLyricModel(b.model), {
      theme,
      genre: typeof b.genre === "string" ? b.genre.trim().slice(0, 60) : "",
      mood: typeof b.mood === "string" ? b.mood.trim().slice(0, 60) : "",
      language: b.language === "en" ? "en" : "ko",
      durationSec: (DURATIONS as readonly number[]).includes(duration) ? duration : DEFAULT_DURATION,
    });
    return NextResponse.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return NextResponse.json({ error: "등록한 Claude API 키가 맞지 않습니다. 키를 다시 확인해 주세요." }, { status: 400 });
    if (status === 429) return NextResponse.json({ error: "Claude 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
    return NextResponse.json({ error: (err as Error).message || "가사를 만들지 못했습니다." }, { status: 502 });
  }
}
