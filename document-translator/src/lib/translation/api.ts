import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkProgramAccessApi } from "../access";
import { platformConfigured } from "../config";
export const NO_STORE = { "Cache-Control": "private, no-store" };
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public needKey = false,
  ) {
    super(message);
  }
}
export async function authorize() {
  if (!platformConfigured())
    throw new AppError("회원 연결 설정이 아직 준비되지 않았습니다.", 503);
  const access = await checkProgramAccessApi();
  if (!access.allowed) throw new AppError(access.error, access.status);
  return access.user;
}
export async function readBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
  maxBytes = 256 * 1024,
): Promise<z.infer<T>> {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    throw new AppError("요청 출처를 확인할 수 없습니다.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("JSON 형식으로 요청해주세요.", 415);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AppError("요청 내용이 너무 큽니다.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("요청 내용이 없습니다.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    bytes += next.value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new AppError("요청 내용이 너무 큽니다.", 413);
    }
    chunks.push(next.value);
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(joined),
    );
  } catch {
    throw new AppError("요청 내용을 읽지 못했습니다.");
  }
  return schema.parse(value);
}
export function failure(e: unknown) {
  if (e instanceof AppError)
    return NextResponse.json(
      { error: e.message, ...(e.needKey ? { needKey: true } : {}) },
      { status: e.status, headers: NO_STORE },
    );
  if (e instanceof z.ZodError)
    return NextResponse.json(
      { error: "입력 값의 길이와 형식을 확인해주세요." },
      { status: 400, headers: NO_STORE },
    );
  return NextResponse.json(
    { error: "서버에 연결하지 못했습니다. 현재 작업은 유지됩니다." },
    { status: 503, headers: NO_STORE },
  );
}
export function dbFailure(code?: string): never {
  if (code === "40001")
    throw new AppError(
      "다른 기기에서 수정한 기록이 있습니다. 보관함에서 다시 불러오거나 새 프로젝트로 저장해주세요.",
      409,
    );
  if (code === "42501" || code === "P0002")
    throw new AppError(
      "이 기록에 접근할 수 없거나 보관 기간이 끝났습니다.",
      404,
    );
  if (code === "53300")
    throw new AppError(
      "진행 중인 작업이 있거나 요청이 많습니다. 잠시 후 다시 실행해주세요.",
      429,
    );
  if (code === "54000")
    throw new AppError(
      "보관함 한도에 도달했습니다. 필요 없는 본인 기록을 정리해주세요.",
      400,
    );
  if (code === "22023")
    throw new AppError(
      "이전 작업과 요청 내용이 다릅니다. 새 작업으로 실행해주세요.",
      409,
    );
  throw new AppError(
    "회원별 저장을 준비하지 못했습니다. 작업은 유지되며 잠시 후 다시 시도할 수 있습니다.",
    503,
  );
}
