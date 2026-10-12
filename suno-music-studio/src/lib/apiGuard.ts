import "server-only";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "./access";
import { AppError } from "./studio/validation";
const privateHeaders = { "Cache-Control": "private, no-store" };
export async function guarded(
  request: Request,
  run: (userId: string, body: Record<string, unknown>) => Promise<unknown>,
) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed)
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: privateHeaders },
      );
    if (
      request.method !== "GET" &&
      request.headers.get("origin") &&
      new URL(request.headers.get("origin")!).host !== new URL(request.url).host
    ) {
      return NextResponse.json(
        { error: "현재 프로그램 화면에서 다시 요청해 주세요." },
        { status: 403, headers: privateHeaders },
      );
    }
    const raw = request.method === "GET" ? "{}" : await request.text();
    if (raw.length > 48_000) throw new AppError("요청이 너무 큽니다.", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("요청 내용을 읽지 못했습니다.");
    }
    if (!body || Array.isArray(body) || typeof body !== "object")
      throw new AppError("요청 내용이 올바르지 않습니다.");
    return NextResponse.json(await run(access.user.id, body), {
      headers: privateHeaders,
    });
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json({ error: e.message }, { status: e.status, headers: privateHeaders });
    if (e instanceof Error && ["AbortError", "TimeoutError"].includes(e.name))
      return NextResponse.json(
        {
          error:
            "요청이 취소되었거나 시간이 초과되었습니다. 다시 시도해 주세요.",
        },
        { status: 408, headers: privateHeaders },
      );
    // Never return provider/DB errors containing credentials or internal details.
    return NextResponse.json(
      { error: "요청을 완료하지 못했습니다. 잠시 뒤 다시 시도해 주세요." },
      { status: 500, headers: privateHeaders },
    );
  }
}
