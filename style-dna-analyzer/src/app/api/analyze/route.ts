// [이미지 모델 교체 2026-10-17] gemini-3.1-flash-image(-preview) → gemini-nano-banana-2.1, gemini-2.5-flash-image → gemini-3.1-flash-lite-image(경량 1K), 기준: ai-image-studio v1.11.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import { NextResponse } from "next/server";
import sharp from "sharp";
import { authorize, parseEngine, requireOwnKey } from "@/lib/dna/apiGuard";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { buildAnalysisSystem, buildAnalysisUser, parseAnalysis } from "@/lib/ai/dnaPrompts";
import { paletteFromRgba } from "@/lib/dna/palette";
import { nearestAspectRatio, type DnaMode, type TargetImageModel } from "@/lib/dna/types";
import { BUCKET, MAX_ANALYSES, toRecord } from "@/lib/dna/records";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_BYTES = 4 * 1024 * 1024;

/** 이미지 1장을 분석해 결과를 보관함에 저장한다(회원 본인 AI 키, 유료 호출 1건). */
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

    const m = typeof body.image === "string" ? DATA_URL.exec(body.image) : null;
    if (!m) return NextResponse.json({ error: "이미지 파일(JPG·PNG·WebP)만 분석할 수 있습니다." }, { status: 400 });
    const mime = `image/${m[1]}`;
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "이미지 용량이 너무 큽니다. 더 작은 이미지로 시도해주세요." }, { status: 400 });

    const mode: DnaMode = body.mode === "mutate" ? "mutate" : "replicate";
    const guidance = typeof body.guidance === "string" ? body.guidance : "";
    const mutationLevel = typeof body.mutationLevel === "number" ? Math.min(100, Math.max(0, body.mutationLevel)) : 30;
    const includeImageTag = Boolean(body.includeImageTag);
    const targetModel: TargetImageModel =
      body.targetModel === "gemini-3.1-flash-lite-image" ? "gemini-3.1-flash-lite-image" : "gemini-nano-banana-2.1";

    const engine = parseEngine(body.engine);
    if (!engine.ok) return engine.response;
    const key = await requireOwnKey(userId, engine.provider, engine.label);
    if (!key.ok) return key.response;

    const supabase = await createClient();
    const { count } = await supabase.from("sda_analyses").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) >= MAX_ANALYSES) {
      return NextResponse.json({ error: `보관함은 ${MAX_ANALYSES}개까지 저장할 수 있습니다. 쓰지 않는 분석을 삭제해주세요.` }, { status: 400 });
    }

    // 종횡비 사전 감지
    const meta = await sharp(bytes).metadata();
    const aspectRatio = nearestAspectRatio(meta.width ?? 1, meta.height ?? 1);

    const promptOptions = {
      mutationLevel,
      includeImageTag,
      targetModel,
      aspectRatio,
    };

    let text: string;
    try {
      text = await callLlm({
        provider: engine.provider,
        model: engine.model,
        apiKey: key.apiKey,
        system: buildAnalysisSystem(mode, new Date().getFullYear(), promptOptions),
        user: buildAnalysisUser(mode, guidance, promptOptions),
        image: { mime, base64: m[2] },
        json: true,
      });
    } catch (err) {
      if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }

    const result = parseAnalysis(text);
    if (!result) return NextResponse.json({ error: "AI 분석 결과를 읽지 못했습니다. 다시 시도하거나 다른 모델을 선택해보세요." }, { status: 502 });

    // 색상 팔레트는 AI 추측이 아니라 실제 픽셀에서 계산한다.
    const raw = await sharp(bytes).resize(96, 96, { fit: "inside" }).ensureAlpha().raw().toBuffer();
    const palette = paletteFromRgba(raw, 5);
    if (!result.aspectRatio) {
      result.aspectRatio = aspectRatio;
    }

    // 보관용 원본은 긴 변 1600px WebP로 줄여 저장한다.
    const stored = await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const admin = createAdminClient();
    const up = await admin.storage.from(BUCKET).upload(path, stored, { contentType: "image/webp", upsert: false });
    if (up.error) {
      console.error("style-dna upload error:", up.error.message.slice(0, 200));
      return NextResponse.json({ error: "이미지를 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
    }

    const title = (result.titleKo || result.titleEn || "새 분석").slice(0, 60);
    const { data, error } = await supabase
      .from("sda_analyses")
      .insert({
        user_id: userId,
        title,
        mode,
        guidance: guidance.slice(0, 800),
        engine: { provider: engine.provider, model: engine.model },
        image_path: path,
        aspect_ratio: aspectRatio,
        palette,
        result,
        history: [],
      })
      .select("*")
      .single();
    if (error || !data) {
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: "분석 결과를 저장하지 못했습니다." }, { status: 500 });
    }
    return NextResponse.json({ record: toRecord(data) });
  } catch (err) {
    console.error("style-dna analyze error:", err instanceof Error ? err.message.slice(0, 200) : "unknown");
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
