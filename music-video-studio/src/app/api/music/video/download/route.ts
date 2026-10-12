import { authorize, requireGeminiKey, errorJson } from "@/lib/apiGuard";
import { GEMINI_BASE, isAllowedOperationName, isAllowedVideoUri, parseOperationStatus } from "@/lib/music/veo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** 완료된 영상을 회원 본인 키로 내려받아 그대로 흘려보낸다. 주소는 작업 결과에서만 얻고 Google 주소만 허용한다. */
export async function GET(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const name = new URL(request.url).searchParams.get("name") ?? "";
    if (!isAllowedOperationName(name)) return errorJson("작업 이름이 올바르지 않습니다.", 400);
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const op = await fetch(`${GEMINI_BASE}/${name}`, { headers: { "x-goog-api-key": key.apiKey }, cache: "no-store", signal: AbortSignal.timeout(25_000) });
    if (!op.ok) return errorJson("영상 정보를 확인하지 못했습니다.");
    const status = parseOperationStatus(await op.json().catch(() => null));
    if (status.state !== "done" || !isAllowedVideoUri(status.videoUri)) return errorJson("아직 영상이 완성되지 않았습니다.", 409);

    const file = await fetch(status.videoUri, { headers: { "x-goog-api-key": key.apiKey }, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(100_000) });
    if (!file.ok || !file.body) return errorJson("영상 파일을 내려받지 못했습니다. 잠시 뒤 다시 시도해주세요.");
    return new Response(file.body, { headers: { "Content-Type": "video/mp4", "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("video download error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("영상을 내려받는 중 오류가 발생했습니다.", 500);
  }
}
