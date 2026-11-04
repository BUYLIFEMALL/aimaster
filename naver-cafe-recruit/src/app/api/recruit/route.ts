import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { OPERATIONS, errorReply, type Payload } from "@/lib/recruitApi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });

// 웹 화면 전용: 설정·아는 사람 넣기·검토·기록 조회. 네이버에는 아무 요청도 보내지 않는다(초대·수집은 회원 PC 확장).
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("origin") !== `${url.protocol}//${request.headers.get("host") ?? url.host}` || request.headers.get("sec-fetch-site") === "cross-site")
    return reply({ error: "같은 프로그램 화면에서 요청해 주세요." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "JSON 요청이 필요합니다." }, 415);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return reply({ error: access.error }, access.status);
  let input: unknown;
  try { const text = await request.text(); if (text.length > 32768) return reply({ error: "요청이 너무 큽니다." }, 413); input = JSON.parse(text); }
  catch { return reply({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const { operation, payload = {} } = input as { operation?: unknown; payload?: unknown };
  if (typeof operation !== "string" || !Object.hasOwn(OPERATIONS, operation)) return reply({ error: "화면에서 할 수 없는 작업입니다." }, 403);
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !OPERATIONS[operation](payload as Payload)) return reply({ error: "입력값을 확인해 주세요." }, 400);
  const { data, error } = await createAdminClient().rpc("ncr_dispatch", { p_user_id: access.user.id, p_operation: operation, p_payload: payload });
  if (error) { const [status, message] = errorReply(error.message); return reply({ error: message }, status); }
  return reply({ data });
}
