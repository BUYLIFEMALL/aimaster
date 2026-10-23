import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { fail, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { AiError } from "@/lib/ai";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// v1.26 본인 목소리 복제(ElevenLabs, 회원 본인 키). GET = 내 계정 목소리 목록(복제한 목소리가 앞), POST = 샘플로 새 목소리 복제.
// 복제한 목소리는 회원 ElevenLabs 계정에 저장되며 우리 DB에는 남기지 않는다. 샘플 파일도 서버에 보관하지 않고 ElevenLabs로만 보낸다.
const EL = "https://api.elevenlabs.io/v1";
const MAX_SAMPLE = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB) 안
const AUDIO = /^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac|wav|x-wav|wave|webm|ogg)$/;

async function keyOf(): Promise<{ userId: string; key: string } | NextResponse> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const key = (await getUserApiKeys(access.user.id, ["elevenlabs"])).elevenlabs;
  if (!key) return json({ error: "ElevenLabs API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.", needKey: true }, 400);
  return { userId: access.user.id, key };
}

function elError(status: number): never {
  if (status === 401 || status === 403) throw new AiError(400, "key", "ElevenLabs가 키를 거절했습니다. 키와 권한(Voices 읽기·쓰기)을 확인해 주세요.");
  if (status === 402 || status === 429) throw new AiError(429, "quota", "ElevenLabs 요금제·사용 한도를 확인해 주세요. 목소리 복제는 유료 요금제(Starter 이상)에서만 됩니다.");
  throw new AiError(502, "provider", `ElevenLabs가 응답하지 않습니다(${status}). 잠시 후 다시 시도해 주세요.`);
}

export async function GET() {
  try {
    const k = await keyOf(); if (k instanceof NextResponse) return k;
    const res = await fetch(`${EL}/voices`, { headers: { "xi-api-key": k.key }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) elError(res.status);
    const data = (await res.json()) as { voices?: { voice_id?: string; name?: string; category?: string }[] };
    const voices = (data.voices ?? []).filter((v) => v.voice_id && v.name)
      .map((v) => ({ id: String(v.voice_id), name: String(v.name).slice(0, 60), mine: v.category === "cloned" || v.category === "professional" || v.category === "generated" }))
      .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));
    return json({ voices });
  } catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "요청 출처를 확인할 수 없습니다." }, 403);
    if (Number(request.headers.get("content-length") ?? 0) > MAX_SAMPLE + 64 * 1024) throw new UserError(413, "샘플 파일은 4MB 이하로 올려 주세요(10초~1분 mp3·m4a 권장).");
    const k = await keyOf(); if (k instanceof NextResponse) return k;
    const form = await request.formData().catch(() => null);
    if (!form) throw new UserError(400, "요청 형식이 올바르지 않습니다.");
    if (form.get("consent") !== "yes") throw new UserError(400, "본인 목소리이거나 사용 동의를 받은 목소리인지 확인해 주세요.");
    const name = String(form.get("name") ?? "").trim().slice(0, 40);
    if (name.length < 1) throw new UserError(400, "목소리 이름을 입력해 주세요.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new UserError(400, "목소리 샘플 파일을 골라 주세요.");
    if (file.size > MAX_SAMPLE) throw new UserError(413, "샘플 파일은 4MB 이하로 올려 주세요(10초~1분 mp3·m4a 권장).");
    if (!AUDIO.test(file.type)) throw new UserError(400, "음성 파일(mp3·m4a·wav·webm·ogg)만 올릴 수 있습니다.");
    const body = new FormData();
    body.append("name", name);
    body.append("files", file, file.name || "sample.mp3");
    body.append("description", "AI 쇼츠 원스톱 제작 자동화에서 복제한 내 목소리");
    const res = await fetch(`${EL}/voices/add`, { method: "POST", headers: { "xi-api-key": k.key }, body, cache: "no-store", signal: AbortSignal.timeout(50_000) });
    if (res.status === 422 || res.status === 400) {
      const t = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      throw new AiError(422, "provider", `ElevenLabs가 샘플을 받지 않았습니다. 잡음이 적은 10초 이상 음성으로 다시 시도해 주세요. ${t}`);
    }
    if (!res.ok) elError(res.status);
    const data = (await res.json()) as { voice_id?: string; requires_verification?: boolean };
    if (!data.voice_id) throw new AiError(502, "provider", "ElevenLabs가 목소리 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return json({ voice: { id: data.voice_id, name, mine: true }, requiresVerification: !!data.requires_verification });
  } catch (e) { return fail(e); }
}
