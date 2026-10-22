import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateNanoBananaImage } from "@/lib/ai/nanoBanana";
import { resolveGeminiImageModel } from "@/lib/ai/geminiModels";
import { cleanRequest, isImageSlot, nodePrompt, upsertNode, type ImageNode } from "@/lib/imageNodes";
import { changeNodes, NodeStoreError, readNodes } from "@/lib/imageNodeStore";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-10 (2026-10-22): 노드 하나의 이미지를 만들거나 다시 만든다 — 요청 1번에 이미지 1장(회원 본인 Gemini 키).
// request를 보내면 저장된 장면 설명 뒤에 붙여 쓰고 노드에 저장(빈 문자열이면 요청 지움, 안 보내면 이전 요청 유지).
// 저장 직전에 최신 원고를 다시 읽어 이 노드만 바꾸므로 다른 이미지·배치는 그대로다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = await request.json().catch(() => null) as { draftId?: string; slot?: unknown; model?: unknown; request?: unknown } | null;
  const draftId = input?.draftId?.trim() ?? "";
  const slot = input?.slot;
  if (!draftId || !isImageSlot(slot)) return NextResponse.json({ error: "만들 본문 이미지를 확인해주세요." }, { status: 400 });

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "gemini");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "본문 이미지를 만들려면 Gemini API 키를 먼저 등록해주세요." }, { status: 400 });

  let path = "";
  try {
    const { draft, state } = await readNodes(supabase, access.user.id, draftId);
    const current = state.images.find((image) => image.slot === slot);
    if (!current?.sentence || !current.prompt) return NextResponse.json({ error: "이 이미지의 장면 설명이 없습니다. 이미지를 삭제한 뒤 다시 넣어주세요." }, { status: 400 });
    const nodeRequest = input?.request === undefined ? current.request ?? "" : cleanRequest(input.request);

    const image = await generateNanoBananaImage({
      apiKey,
      topic: draft.topic,
      title: draft.title,
      keywords: Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "",
      model: resolveGeminiImageModel(input?.model),
      sceneDescription: nodePrompt(current.prompt, nodeRequest),
    });
    path = `${access.user.id}/${draftId}/${slot}-${Date.now()}.${image.mimeType === "image/jpeg" ? "jpg" : "png"}`;
    const { error: uploadError } = await supabase.storage.from("naver-blog-seo-images").upload(path, Uint8Array.from(Buffer.from(image.base64, "base64")), { contentType: image.mimeType, upsert: false });
    if (uploadError) { path = ""; throw new Error("생성한 본문 이미지를 저장하지 못했습니다."); }

    const result = await changeNodes(supabase, access.user.id, draftId, ({ images, blocks }) => {
      const latest = images.find((item) => item.slot === slot);
      if (!latest) return null; // 만드는 동안 삭제됨
      const next: ImageNode = { ...latest, request: nodeRequest || undefined, path, mimeType: image.mimeType, model: image.model };
      return { images: upsertNode(images, next), blocks };
    });
    if (!result.saved) {
      await supabase.storage.from("naver-blog-seo-images").remove([path]);
      return NextResponse.json({ error: "이미지를 만드는 동안 이 칸이 삭제됐습니다." }, { status: 409 });
    }
    const savedPath = path;
    path = ""; // 저장 완료 — 아래에서 오류가 나도 새 파일은 지우지 않음
    const oldPath = result.previous.images.find((item) => item.slot === slot)?.path;
    if (oldPath && oldPath !== savedPath) await supabase.storage.from("naver-blog-seo-images").remove([oldPath]);
    return NextResponse.json({ image: result.state.images.find((item) => item.slot === slot) });
  } catch (error) {
    if (path) await supabase.storage.from("naver-blog-seo-images").remove([path]);
    const status = error instanceof NodeStoreError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "본문 이미지를 만들지 못했습니다." }, { status });
  }
}
