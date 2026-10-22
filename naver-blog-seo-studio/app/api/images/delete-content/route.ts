import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { isImageSlot, removeNode, removeNodeBlock } from "@/lib/imageNodes";
import { changeNodes, NodeStoreError } from "@/lib/imageNodeStore";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-10 (2026-10-22): 본문 이미지 노드 하나 삭제 — 기록·블록·저장 파일을 함께 지운다. 다른 노드는 그대로. AI 호출 없음.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string; slot?: unknown } | null;
  const draftId = input?.draftId?.trim() ?? "";
  const slot = input?.slot;
  if (!draftId || !isImageSlot(slot)) return NextResponse.json({ error: "삭제할 본문 이미지를 확인해주세요." }, { status: 400 });
  const supabase = await createClient();
  try {
    const result = await changeNodes(supabase, access.user.id, draftId, ({ images, blocks }) =>
      images.some((image) => image.slot === slot) || blocks.some((block) => block.type === "image" && block.slot === slot)
        ? { images: removeNode(images, slot), blocks: removeNodeBlock(blocks, slot) } : null);
    const oldPath = result.previous.images.find((image) => image.slot === slot)?.path;
    if (result.saved && oldPath) await supabase.storage.from("naver-blog-seo-images").remove([oldPath]);
    return NextResponse.json({ images: result.state.images, blocks: result.state.blocks });
  } catch (error) {
    const status = error instanceof NodeStoreError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "본문 이미지를 삭제하지 못했습니다." }, { status });
  }
}
