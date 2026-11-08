import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, readAlbumImage } from "@/lib/ai/lyrics";
import { LYRIC_PROVIDERS, toLyricModel, toLyricProvider } from "@/lib/lyricModels";
import { parseAlbumImage } from "@/lib/albumRead";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 앨범 2단계(v1.36): 앨범 그림 → 곡 만들기 칸(제목·주제·장르·분위기·빠르기·목소리·스타일).
// 그림은 브라우저가 회원 PC 엔진에서 받아 줄여 보낸 것 — 서버에 저장하지 않고 회원 본인 AI 키로 한 번만 읽는다(재시도 없음).
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const image = parseAlbumImage(b.image, b.mime);
  if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

  const provider = toLyricProvider(b.provider);
  const label = LYRIC_PROVIDERS.find((p) => p.id === provider)!.label;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json({ error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 등록해 주세요.`, needApiKey: true }, { status: 400 });
  }

  try {
    return NextResponse.json(await readAlbumImage(provider, apiKey, toLyricModel(provider, b.model), { data: image.data, mime: image.mime }));
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "그림을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
