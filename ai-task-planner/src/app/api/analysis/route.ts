import { NextResponse, type NextRequest } from "next/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { authorizePlanner, plannerFailure, NO_STORE } from "@/lib/planner/api";
import { loadWorkspace } from "@/lib/planner/repository";
import { analysisData, analysisInputSchema, DEFAULT_AI_MODEL } from "@/lib/planner/ai";
import { analyzeWithGemini } from "@/lib/planner/gemini";
import { PlannerError } from "@/lib/planner/engine";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new PlannerError("요청 출처를 확인할 수 없습니다.", 403);
    const user = await authorizePlanner();
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 3000) throw new PlannerError("입력 크기를 넘었습니다.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new PlannerError("입력 형식을 확인해주세요."); }
    const input = analysisInputSchema.parse(parsed), record = await loadWorkspace(user.id);
    if (record.revision !== input.revision) throw new PlannerError("기록이 변경됐습니다. 최신 기록을 불러온 뒤 분석해주세요.", 409);
    const data = analysisData(record.workspace, input, Date.now());
    if (!data.completedCount) throw new PlannerError("선택 범위에 완료된 할 일이 없습니다. 완료 기록을 만든 뒤 분석해주세요.");
    if (data.tasks.length > 300) throw new PlannerError("분석할 할 일이 많습니다. 분류나 검색으로 300개 이하로 줄여주세요.", 413);
    const key = await resolveApiKey(user.id);
    if (!key) return NextResponse.json({ error: "본인 Gemini 키를 등록해주세요.", needKey: true }, { status: 400, headers: NO_STORE });
    const model = record.workspace.settings.aiModel ?? DEFAULT_AI_MODEL;
    const result = await analyzeWithGemini(key, model, data);
    return NextResponse.json({ result, model, revision: record.revision, date: input.date, analyzedAt: new Date().toISOString() }, { headers: NO_STORE });
  } catch (error) { return plannerFailure(error); }
}
