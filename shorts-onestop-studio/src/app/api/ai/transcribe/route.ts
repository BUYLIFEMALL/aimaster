import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// v1.29 레퍼런스 쇼츠에서 대본 따기: 브라우저가 영상에서 뽑은 소리(모노 WAV, 공용 browser-video-extract)를
// 회원 본인 OpenAI 키로 Whisper 받아쓰기 → 글만 돌려준다(영상·소리는 저장하지 않음).
const MAX_AUDIO_B64 = 3_000_000;

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 3_200_000); if (g instanceof NextResponse) return g;
    const audio = g.body.audio && typeof g.body.audio === "object" ? (g.body.audio as Record<string, unknown>) : null;
    const data = typeof audio?.data === "string" ? audio.data : "";
    if (audio?.mimeType !== "audio/wav" || !data || data.length > MAX_AUDIO_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      throw new UserError(400, "영상의 소리를 읽지 못했습니다. 다른 영상 파일로 다시 시도해 주세요.");
    }
    const key = (await getUserApiKeys(g.userId, ["openai"])).openai;
    if (!key) throw new UserError(400, "받아쓰기는 본인 OpenAI 키가 필요합니다. 설정에서 등록해 주세요.", { needKey: true, provider: "openai" });

    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from(data, "base64")], { type: "audio/wav" }), "reference.wav");
    fd.append("model", "whisper-1");
    fd.append("response_format", "text");
    fd.append("language", "ko");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd, cache: "no-store", signal: AbortSignal.timeout(90_000) });
    if (res.status === 401 || res.status === 403) throw new UserError(400, "OpenAI API 키가 올바르지 않습니다. 설정에서 본인 키를 확인해 주세요.", { needKey: true, provider: "openai" });
    if (res.status === 429) throw new UserError(429, "OpenAI 사용 한도나 잔액을 초과했습니다. OpenAI 계정을 확인해 주세요.");
    if (!res.ok) throw new UserError(502, `받아쓰기에 실패했습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
    const transcript = (await res.text()).trim().slice(0, 8000);
    if (!transcript) throw new UserError(422, "영상에서 말소리를 찾지 못했습니다. 말하는 영상인지 확인해 주세요.");
    return json({ transcript });
  } catch (e) { return fail(e); }
}
