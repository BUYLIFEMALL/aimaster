// [이미지 모델 교체 2026-10-17] gemini-3.1-flash-image(-preview) → gemini-nano-banana-2.1, gemini-2.5-flash-image → gemini-3.1-flash-lite-image(경량 1K), 기준: ai-image-studio v1.11.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import { NextResponse } from "next/server";
import { authorize, parseEngine, requireOwnKey } from "@/lib/dna/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildRefineSystem, buildRefineUser, parseRefine } from "@/lib/ai/dnaPrompts";
import { toRecord, UUID_RE } from "@/lib/dna/records";
import { createClient } from "@/lib/supabase/server";
import type { TargetImageModel } from "@/lib/dna/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** 피드백으로 마스터 프롬프트를 미세 보정한다(회원 본인 AI 키, 유료 호출 1건). */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const userId = gate.auth.user.id;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const id = typeof body.id === "string" ? body.id : "";
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "분석 기록 주소가 올바르지 않습니다." }, { status: 400 });
    if (!feedback) return NextResponse.json({ error: "보정할 내용을 입력해주세요." }, { status: 400 });

    const engine = parseEngine(body.engine);
    if (!engine.ok) return engine.response;
    const key = await requireOwnKey(userId, engine.provider, engine.label);
    if (!key.ok) return key.response;

    const supabase = await createClient();
    const { data: row } = await supabase.from("sda_analyses").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!row) return NextResponse.json({ error: "분석 기록을 찾을 수 없습니다." }, { status: 404 });
    const current = toRecord(row);

    const includeImageTag = typeof body.includeImageTag === "boolean" ? body.includeImageTag : current.includeImageTag;
    const targetModel: TargetImageModel =
      body.targetModel === "gemini-3.1-flash-lite-image" ? "gemini-3.1-flash-lite-image" : "gemini-nano-banana-2.1";

    let text: string;
    try {
      text = await callLlm({
        provider: engine.provider,
        model: engine.model,
        apiKey: key.apiKey,
        system: buildRefineSystem(new Date().getFullYear(), { includeImageTag, targetModel }),
        user: buildRefineUser(current.result, feedback),
        json: true,
      });
    } catch (err) {
      if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }
    const refined = parseRefine(text);
    if (!refined) return NextResponse.json({ error: "보정 결과를 읽지 못했습니다. 다시 시도해주세요." }, { status: 502 });

    const result = {
      ...current.result,
      masterPromptEn: refined.masterPromptEn,
      masterPromptKo: refined.masterPromptKo,
      structuralBlueprintHtml: refined.structuralBlueprintHtml || current.result.structuralBlueprintHtml,
      styleAnalysisHtml: refined.styleAnalysisHtml || current.result.styleAnalysisHtml,
    };
    const history = [...current.history, { at: new Date().toISOString(), feedback: feedback.slice(0, 600), note: refined.note }].slice(-20);
    const { data, error } = await supabase
      .from("sda_analyses")
      .update({ result, history, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error || !data) return NextResponse.json({ error: "보정 결과를 저장하지 못했습니다." }, { status: 500 });
    return NextResponse.json({ record: toRecord(data) });
  } catch (err) {
    console.error("style-dna refine error:", err instanceof Error ? err.message.slice(0, 200) : "unknown");
    return NextResponse.json({ error: "보정 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
