import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, writeArtPrompt } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";
import { LIMITS } from "@/lib/songs";
import { ART_PROMPT_LIMIT } from "@/lib/albumArt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 곡 제목·스타일·가사 → 내 PC 그림 모델용 영어 설명문(0.7.0, 2026-11-06 주인님 결정 「회원 AI 키로 자동 + 직접 입력」). 회원 본인 키만, 재시도 없음.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const title = str(b.title, LIMITS.title);
  const style = str(b.style, LIMITS.style);
  const lyrics = str(b.lyrics, LIMITS.lyrics);
  // 회원이 한글로 적은 그림 장면 — 영어로 바꿔 살린다(v1.35)
  const idea = str(b.idea, ART_PROMPT_LIMIT);
  if (!idea && !title && !style && !lyrics) return NextResponse.json({ error: "그림 설명이나 곡 제목·스타일·가사가 있어야 그림 설명을 만들 수 있습니다." }, { status: 400 });

  const provider = toLyricProvider(b.provider);
  const label = LYRIC_PROVIDERS.find((p) => p.id === provider)!.label;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 등록하거나, 그림 설명을 영어로 직접 적어 주세요.`, needApiKey: true },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await writeArtPrompt(provider, apiKey, toLyricModel(provider, b.model), { title, style, lyrics, idea, artStyle: str(b.artStyle, 20) }));
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "그림 설명을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
