import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/dna/apiGuard";
import { generateImage } from "@/lib/ai/image";
import { findImageModel } from "@/lib/ai/imageModels";
import { optimizeBackground } from "@/lib/ai/imageOptimize";
import { buildTestPrompt, fillSubject, hasPlaceholder, KOREAN_PEOPLE_RULE, NO_TEXT_RULE } from "@/lib/ai/dnaPrompts";
import { BUCKET, toRecord, UUID_RE } from "@/lib/dna/records";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** 마스터 프롬프트로 이미지를 1장 생성해 원본과 비교할 수 있게 돌려준다(회원 본인 Gemini 키, 유료 호출 1건). 결과는 저장하지 않는다. */
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
    const subject = typeof body.subject === "string" ? body.subject : "";
    const attachImage = body.attachImage === true;
    const imageModel = typeof body.imageModel === "string" ? body.imageModel : "";
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "분석 기록 주소가 올바르지 않습니다." }, { status: 400 });
    if (!findImageModel(imageModel)) return NextResponse.json({ error: "지원하지 않는 이미지 모델입니다." }, { status: 400 });

    const supabase = await createClient();
    const { data: row } = await supabase.from("sda_analyses").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!row) return NextResponse.json({ error: "분석 기록을 찾을 수 없습니다." }, { status: 404 });
    const record = toRecord(row);

    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt.trim() : "";
    const customReference = typeof body.customReference === "string" ? body.customReference : "";
    const ratio = typeof body.ratio === "string" ? body.ratio : record.aspectRatio;

    // 피사체 자리표시자 검사 (customPrompt가 없거나 자리표시자가 남아 있는 경우)
    const effectivePrompt = customPrompt || fillSubject(record.result.masterPromptEn, subject);
    if (hasPlaceholder(effectivePrompt)) {
      return NextResponse.json({ error: "프롬프트의 [INSERT SUBJECT HERE] 자리에 넣을 피사체를 입력하거나 프롬프트를 완성해주세요." }, { status: 400 });
    }

    const key = await requireOwnKey(userId, "gemini", "Google Gemini");
    if (!key.ok) return key.response;

    let reference: { mime: string; base64: string } | undefined;
    if (customReference.startsWith("data:image/")) {
      const parts = customReference.split(",");
      const mime = parts[0].split(":")[1].split(";")[0];
      reference = { mime, base64: parts[1] };
    } else if (attachImage) {
      const path = (row.image_path as string) ?? "";
      if (!path.startsWith(`${userId}/`)) return NextResponse.json({ error: "원본 이미지를 찾을 수 없습니다." }, { status: 404 });
      const dl = await createAdminClient().storage.from(BUCKET).download(path);
      if (dl.error || !dl.data) return NextResponse.json({ error: "원본 이미지를 불러오지 못했습니다." }, { status: 500 });
      reference = { mime: "image/webp", base64: Buffer.from(await dl.data.arrayBuffer()).toString("base64") };
    }

    const prompt = customPrompt
      ? [
          customPrompt,
          reference ? "Use the attached image as a style reference. Create a NEW image based on the prompt." : "",
          `Aspect ratio ${ratio}.`,
          KOREAN_PEOPLE_RULE,
          NO_TEXT_RULE,
        ].filter(Boolean).join("\n")
      : buildTestPrompt(record.result.masterPromptEn, subject, ratio, !!reference);

    const image = await generateImage({ apiKey: key.apiKey, imageModel, prompt, ratio, reference });
    const optimized = await optimizeBackground(image.bytes, image.mime);
    return NextResponse.json({ image: `data:${optimized.mime};base64,${optimized.bytes.toString("base64")}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // generateImage 의 오류 문구는 키가 들어가지 않는 한국어 안내문이다.
    return NextResponse.json({ error: message && message.length < 200 ? message : "이미지 생성 중 오류가 발생했습니다." }, { status: 502 });
  }
}
