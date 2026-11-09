import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { LyricError, styleFromAudio } from "@/lib/ai/lyrics";
import { toLyricModel } from "@/lib/lyricModels";
import { REF_MAX_B64 } from "@/lib/refAudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

// 참고곡 → 음악 스타일(백로그 D-9). 브라우저가 줄인 짧은 WAV만 받고 저장하지 않는다. 회원 본인 Gemini 키만(최상위 규칙).
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const wav = typeof b.audio === "string" ? b.audio : "";
  if (!wav || wav.length > REF_MAX_B64 || !/^[A-Za-z0-9+/]+=*$/.test(wav)) return NextResponse.json({ error: "참고곡 소리가 비었거나 너무 큽니다." }, { status: 400 });
  // WAV 머리(RIFF … WAVE)만 받는다
  const head = Buffer.from(wav.slice(0, 16), "base64");
  if (head.toString("latin1", 0, 4) !== "RIFF" || head.toString("latin1", 8, 12) !== "WAVE") return NextResponse.json({ error: "참고곡 소리 형식이 맞지 않습니다." }, { status: 400 });

  const apiKey = await getUserApiKey(access.user.id, "gemini");
  if (!apiKey) {
    return NextResponse.json(
      { error: "참고곡 듣기는 Gemini만 할 수 있습니다. [API키등록·플랫폼연동]에서 본인 Gemini 키를 먼저 등록해 주세요.", needApiKey: true },
      { status: 400 }
    );
  }
  try {
    const result = await styleFromAudio(apiKey, toLyricModel("gemini", b.model), { wavBase64: wav, instrumental: b.instrumental === true });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LyricError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: "Gemini 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 504 });
    return NextResponse.json({ error: "참고곡 스타일을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
