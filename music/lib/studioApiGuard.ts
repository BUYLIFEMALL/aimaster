import "server-only";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { AppError } from "@/lib/studio/validation";
import type { Provider } from "@/lib/studio/config";

// 정밀 기획 스튜디오 API 공통 보호(2026-10-21 병합 M1, 옛 suno-music-studio `src/lib/apiGuard.ts`에서 가져옴):
// 이용 권한 확인, 다른 사이트에서의 요청 차단, 본문 48KB 제한, 캐시 금지, 공급사 오류 원문 숨김.
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function guarded(
  request: Request,
  run: (userId: string, body: Record<string, unknown>) => Promise<unknown>,
  maxBytes = 48_000,
) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed)
      return NextResponse.json({ error: access.error }, { status: access.status, headers: privateHeaders });
    const origin = request.headers.get("origin");
    if (request.method !== "GET" && origin && new URL(origin).host !== new URL(request.url).host) {
      return NextResponse.json(
        { error: "현재 프로그램 화면에서 다시 요청해 주세요." },
        { status: 403, headers: privateHeaders },
      );
    }
    const raw = request.method === "GET" ? "{}" : await request.text();
    if (raw.length > maxBytes) throw new AppError("요청이 너무 큽니다.", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("요청 내용을 읽지 못했습니다.");
    }
    if (!body || Array.isArray(body) || typeof body !== "object") throw new AppError("요청 내용이 올바르지 않습니다.");
    return NextResponse.json(await run(access.user.id, body), { headers: privateHeaders });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status, headers: privateHeaders });
    if (e instanceof Error && ["AbortError", "TimeoutError"].includes(e.name))
      return NextResponse.json(
        { error: "요청이 취소되었거나 시간이 초과되었습니다. 다시 시도해 주세요." },
        { status: 408, headers: privateHeaders },
      );
    // 공급사·DB 오류에는 키나 내부 정보가 섞일 수 있어 원문을 돌려주지 않는다.
    return NextResponse.json(
      { error: "요청을 완료하지 못했습니다. 잠시 뒤 다시 시도해 주세요." },
      { status: 500, headers: privateHeaders },
    );
  }
}

/** 회원 본인 키만(운영자 키 폴백 없음). 없으면 등록 위치를 알려 주는 오류. */
export async function requireStudioKey(userId: string, provider: Provider): Promise<string> {
  const supabase = await createClient();
  const key = await resolveApiKey(supabase, userId, provider);
  if (!key) throw new AppError("선택한 AI의 본인 API 키를 [API키등록·플랫폼연동]에서 등록해 주세요.", 400);
  return key;
}
