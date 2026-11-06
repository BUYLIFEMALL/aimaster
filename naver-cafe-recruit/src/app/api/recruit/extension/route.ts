import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorReply, type Payload } from "@/lib/recruitApi";
import { EXTENSION_OPERATIONS, allowedOrigin } from "@/lib/extensionApi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });

// 확장 전용: 회원 로그인 쿠키로 부른다(회원 본인 것만). 서버는 네이버에 접속하지 않는다 —
// 확장이 회원이 직접 로그인한 브라우저에서 초대하고, 여기에는 「다음 대상」을 묻고 「결과」만 적는다.
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!allowedOrigin(request.headers.get("origin"), `${url.protocol}//${request.headers.get("host") ?? url.host}`))
    return reply({ error: "확장 프로그램이나 같은 프로그램 화면에서만 요청할 수 있습니다." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "JSON 요청이 필요합니다." }, 415);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return reply({ error: access.error }, access.status);
  let input: unknown;
  try { const text = await request.text(); if (text.length > 4096) return reply({ error: "요청이 너무 큽니다." }, 413); input = JSON.parse(text); }
  catch { return reply({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const { operation, payload = {} } = input as { operation?: unknown; payload?: unknown };
  if (typeof operation !== "string" || !Object.hasOwn(EXTENSION_OPERATIONS, operation)) return reply({ error: "확장에서 할 수 없는 작업입니다." }, 403);
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !EXTENSION_OPERATIONS[operation](payload as Payload)) return reply({ error: "입력값을 확인해 주세요." }, 400);
  const { data, error } = await createAdminClient().rpc("ncr_dispatch", { p_user_id: access.user.id, p_operation: operation, p_payload: payload });
  if (error) { const [status, message] = errorReply(error.message); return reply({ error: message }, status); }
  return reply({ data });
}
