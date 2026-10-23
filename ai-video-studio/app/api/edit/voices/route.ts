import { NextResponse } from "next/server";
import { checkProgramAccessApi, getUserApiKey } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 쇼츠 원스톱 /api/voice/elevenlabs GET과 같은 규칙: 회원 본인 ElevenLabs 계정의 목소리 목록(복제한 내 목소리가 앞). 우리 DB에는 남기지 않는다.
export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const key = await getUserApiKey(user.id, "elevenlabs");
  if (!key) return NextResponse.json({ error: "ElevenLabs API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.", needKey: true }, { status: 400 });
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!res) return NextResponse.json({ error: "ElevenLabs가 응답하지 않습니다. 잠시 후 다시 시도해 주세요." }, { status: 504 });
  if (res.status === 401 || res.status === 403) return NextResponse.json({ error: "ElevenLabs가 키를 거절했습니다. 키와 권한(Voices 읽기)을 확인해 주세요." }, { status: 400 });
  if (!res.ok) return NextResponse.json({ error: `ElevenLabs가 응답하지 않습니다(${res.status}). 잠시 후 다시 시도해 주세요.` }, { status: 502 });
  const data = (await res.json()) as { voices?: { voice_id?: string; name?: string; category?: string }[] };
  const voices = (data.voices ?? []).filter((v) => v.voice_id && v.name)
    .map((v) => ({ id: String(v.voice_id), name: String(v.name).slice(0, 60), mine: v.category === "cloned" || v.category === "professional" || v.category === "generated" }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));
  return NextResponse.json({ voices }, { headers: { "Cache-Control": "private, no-store" } });
}
