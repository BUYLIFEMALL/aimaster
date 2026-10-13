import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkProgramAccessApi } from "@/lib/access";
import { platformConfigured } from "@/lib/config";
import { loadWorkspace, commitWorkspace } from "@/lib/planner/repository";
import { applyCommand, commandSchema, PlannerError } from "@/lib/planner/engine";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const headers = { "Cache-Control": "private, no-store" };
const bodySchema = z.object({ commandId: z.string().uuid(), revision: z.number().int().min(0), command: commandSchema }).strict();
function failure(error: unknown) {
  if (error instanceof PlannerError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof z.ZodError) return NextResponse.json({ error: "입력 값과 기록 형식을 확인해주세요." }, { status: 400, headers });
  return NextResponse.json({ error: "기록 서버에 연결하지 못했습니다. 다시 시도해주세요." }, { status: 503, headers });
}
async function authorize() {
  if (!platformConfigured()) throw new PlannerError("로그인 연결과 회원별 기록 저장을 준비하고 있습니다.", 503);
  const access = await checkProgramAccessApi();
  if (!access.allowed) throw new PlannerError(access.error, access.status);
  return access.user;
}
export async function GET() {
  try {
    const user = await authorize();
    const record = await loadWorkspace(user.id);
    return NextResponse.json({ workspace: record.workspace, revision: record.revision, userId: user.id, serverNow: Date.now() }, { headers });
  } catch (e) { return failure(e); }
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new PlannerError("요청 출처를 확인할 수 없습니다.", 403);
    const user = await authorize();
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 4 * 1024 * 1024 + 1024) throw new PlannerError("한 번에 저장할 수 있는 입력 크기를 넘었습니다.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new PlannerError("입력 형식을 확인해주세요."); }
    const body = bodySchema.parse(parsed);
    if (body.command.type !== "backup.merge" && Buffer.byteLength(raw, "utf8") > 50_000) throw new PlannerError("입력 크기를 넘었습니다.", 413);
    const record = await loadWorkspace(user.id);
    if (record.recentCommands.includes(body.commandId)) return NextResponse.json({ workspace: record.workspace, revision: record.revision, userId: user.id, serverNow: Date.now() }, { headers });
    if (body.revision !== record.revision) throw new PlannerError("다른 화면에서 기록이 변경됐습니다. 입력을 보존했습니다. 최신 기록을 불러온 뒤 다시 저장해주세요.", 409);
    const updated = applyCommand(record.workspace, body.command, Date.now());
    const saved = await commitWorkspace(user.id, record.revision, body.commandId, updated);
    return NextResponse.json({ workspace: saved.workspace, revision: saved.revision, userId: user.id, serverNow: Date.now() }, { headers });
  } catch (e) { return failure(e); }
}
