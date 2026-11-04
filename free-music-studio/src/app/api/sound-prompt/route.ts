import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, writeSoundPrompt } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 한국어로 적은 효과음·연주곡 설명 → Stable Audio 3용 영어 설명(2026-11-05 주인님 「한글로 작성하면 영어로 변환」「모델 선택도」). 회원 본인 키만.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 400) : "";
  if (!text) return NextResponse.json({ error: "어떤 소리인지 한국어로 적어 주세요." }, { status: 400 });
  const kind = b.kind === "music" ? "music" : "sfx";
  const durationSec = Math.min(380, Math.max(1, Math.floor(Number(b.duration_sec) || 5)));

  const provider = toLyricProvider(b.provider);
  const label = LYRIC_PROVIDERS.find((p) => p.id === provider)!.label;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록하거나 다른 AI를 골라 주세요.`, needApiKey: true },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await writeSoundPrompt(provider, apiKey, toLyricModel(provider, b.model), { text, kind, durationSec }));
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "영어 설명을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
