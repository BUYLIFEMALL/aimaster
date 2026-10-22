import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { detectImageType, firstSentence, freeSlots, isImageSlot, placeNodeBlock, upsertNode, UPLOAD_MAX_BYTES, type ImageNode } from "@/lib/imageNodes";
import { changeNodes, NodeStoreError, readNodes } from "@/lib/imageNodeStore";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v2.01 (2026-10-22): 「내 사진」 — 노드 하나를 내 사진으로 바꾸거나(slot) 그 문단 앞에 새 노드로 넣는다(beforeBlockId + paragraph). AI 호출 없음.
// 파일 형식은 내용으로 확인(JPG·PNG·WebP, 4MB 이하), 회원 폴더에 저장, 서버가 최신 원고를 다시 읽어 그 노드만 바꾼다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const draftId = String(form?.get("draftId") ?? "").trim();
  const slotInput = form?.get("slot");
  const beforeBlockId = String(form?.get("beforeBlockId") ?? "").slice(0, 80);
  const paragraph = String(form?.get("paragraph") ?? "").trim().slice(0, 4000);
  if (!draftId || !(file instanceof File)) return NextResponse.json({ error: "올릴 사진을 골라주세요." }, { status: 400 });
  if (file.size > UPLOAD_MAX_BYTES) return NextResponse.json({ error: "사진은 4MB 이하로 올려주세요." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectImageType(bytes);
  if (!mimeType) return NextResponse.json({ error: "JPG·PNG·WebP 사진만 올릴 수 있습니다." }, { status: 400 });
  const replacing = slotInput !== null && slotInput !== "";
  if (replacing && !isImageSlot(slotInput)) return NextResponse.json({ error: "바꿀 본문 이미지를 확인해주세요." }, { status: 400 });
  if (!replacing && paragraph.length < 2) return NextResponse.json({ error: "사진을 넣을 문단을 확인해주세요." }, { status: 400 });

  const supabase = await createClient();
  let path = "";
  try {
    const { state } = await readNodes(supabase, access.user.id, draftId);
    const slot = replacing ? slotInput as ImageNode["slot"] : freeSlots(state.images)[0];
    if (!slot) return NextResponse.json({ error: "본문 이미지는 최대 6장입니다. 다른 이미지를 삭제한 뒤 넣어주세요." }, { status: 400 });
    if (replacing && !state.images.some((image) => image.slot === slot)) return NextResponse.json({ error: "바꿀 본문 이미지를 찾지 못했습니다." }, { status: 404 });
    path = `${access.user.id}/${draftId}/${slot}-${Date.now()}.${mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp"}`;
    const { error: uploadError } = await supabase.storage.from("naver-blog-seo-images").upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) { path = ""; throw new Error("사진을 저장하지 못했습니다."); }

    const result = await changeNodes(supabase, access.user.id, draftId, ({ images, blocks }) => {
      const latest = images.find((image) => image.slot === slot);
      if (replacing) {
        if (!latest) return null; // 올리는 동안 삭제됨
        return { images: upsertNode(images, { ...latest, path, mimeType, model: "내 사진" }), blocks };
      }
      if (latest) return null; // 그 사이 다른 창에서 이 칸을 씀
      const node: ImageNode = { slot, sentence: firstSentence(paragraph), path, mimeType, model: "내 사진" };
      const placed = placeNodeBlock(blocks, node, beforeBlockId || undefined);
      return { images: upsertNode(images, node), blocks: placed !== blocks ? placed : placeNodeBlock(blocks, node) };
    });
    if (!result.saved) {
      await supabase.storage.from("naver-blog-seo-images").remove([path]);
      return NextResponse.json({ error: "그 사이 다른 창에서 이미지가 바뀌었습니다. 새로고침 후 다시 시도해 주세요." }, { status: 409 });
    }
    const savedPath = path;
    path = "";
    const oldPath = result.previous.images.find((image) => image.slot === slot)?.path;
    if (oldPath && oldPath !== savedPath) await supabase.storage.from("naver-blog-seo-images").remove([oldPath]);
    return NextResponse.json({ image: result.state.images.find((image) => image.slot === slot) });
  } catch (error) {
    if (path) await supabase.storage.from("naver-blog-seo-images").remove([path]);
    const status = error instanceof NodeStoreError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "사진을 올리지 못했습니다." }, { status });
  }
}
