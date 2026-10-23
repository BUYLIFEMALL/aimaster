import { NextResponse } from "next/server";
import { checkProgramAccessApi, getUserApiKey, logProgramUsage } from "@/lib/access";
import { POLISH_MODEL, parsePolishResponse, polishRequestBody } from "@/lib/promptPolish";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 영상 설명 AI 다듬기(v1.10, v1.11부터 3안) — 회원 본인 Gemini 키로 영어 영상 설명을 만든다. 자동 재시도 없음 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  const idea = str(body.idea, 1200);
  if (idea.length < 2) return NextResponse.json({ error: "다듬을 영상 설명을 먼저 입력해 주세요." }, { status: 400 });
  const seconds = typeof body.seconds === "number" && Number.isFinite(body.seconds) ? Math.min(30, Math.max(1, Math.round(body.seconds))) : 5;

  const key = await getUserApiKey(user.id, "gemini");
  if (!key) {
    return NextResponse.json({ error: "Gemini API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.", needKey: true }, { status: 400 });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${POLISH_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify(polishRequestBody({ idea, style: str(body.style, 200) || null, camera: str(body.camera, 200) || null, seconds, hasImage: body.hasImage === true })),
  }).catch(() => null);
  if (!res) return NextResponse.json({ error: "설명 다듬기가 늦어지고 있습니다. 잠시 뒤 다시 눌러 주세요." }, { status: 504 });
  if (!res.ok) {
    const msg = res.status === 400 || res.status === 401 || res.status === 403
      ? "Gemini 키를 확인해 주세요(키가 틀렸거나 사용이 막혀 있습니다)."
      : res.status === 429
        ? "Gemini 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요."
        : "Gemini가 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요.";
    return NextResponse.json({ error: msg }, { status: res.status === 429 ? 429 : 502 });
  }
  const options = parsePolishResponse(await res.json().catch(() => null));
  if (!options.length) return NextResponse.json({ error: "AI가 다듬은 설명을 돌려주지 않았습니다. 다시 눌러 주세요." }, { status: 502 });

  await logProgramUsage(user.id, "prompt_polish", 1, { model: POLISH_MODEL, chars: idea.length, options: options.length });
  // options: 다듬은 안 목록(v1.11). prompt·note는 첫 안(예전 화면 호환)
  return NextResponse.json({ options, prompt: options[0].prompt, note: options[0].note }, { headers: { "Cache-Control": "private, no-store" } });
}
