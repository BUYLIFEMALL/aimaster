import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, errorJson } from "@/lib/apiGuard";
import { geminiErrorMessage } from "@/lib/ai/gemini";
import { GEMINI_BASE, isAllowedOperationName, parseOperationStatus } from "@/lib/music/veo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/** 영상 생성 진행 상태를 확인한다(회원 본인 키로 조회만 하므로 비용이 없다). */
export async function GET(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const name = new URL(request.url).searchParams.get("name") ?? "";
    if (!isAllowedOperationName(name)) return errorJson("작업 이름이 올바르지 않습니다.", 400);
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const response = await fetch(`${GEMINI_BASE}/${name}`, { headers: { "x-goog-api-key": key.apiKey }, cache: "no-store", signal: AbortSignal.timeout(25_000) });
    if (!response.ok) return errorJson(geminiErrorMessage(response.status, "영상 상태 확인"));
    const status = parseOperationStatus(await response.json().catch(() => null));
    return NextResponse.json({ state: status.state, message: status.state === "failed" ? status.message : undefined });
  } catch (err) {
    console.error("video status error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("영상 상태를 확인하지 못했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
