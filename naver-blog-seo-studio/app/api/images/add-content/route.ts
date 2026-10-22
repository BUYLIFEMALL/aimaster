import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { getUserOpenAIContentModel } from "@/lib/ai/openaiModels";
import { selectContentVisuals } from "@/lib/ai/contentVisuals";
import { freeSlots, placeNodeBlock, upsertNode } from "@/lib/imageNodes";
import { changeNodes, NodeStoreError, readNodes } from "@/lib/imageNodeStore";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-10 (2026-10-22): 「이 문단에 이미지」 — 그 문단에서 기준 문장·장면 설명을 정하고(글 AI 1회) 빈 칸 노드를 그 문단 앞에 둔다.
// 이미지는 화면이 이어서 /api/images/regenerate-content로 1장 만든다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string; paragraph?: unknown; beforeBlockId?: unknown; openaiModel?: unknown } | null;
  const draftId = input?.draftId?.trim() ?? "";
  const paragraph = typeof input?.paragraph === "string" ? input.paragraph.trim().slice(0, 4000) : "";
  const beforeBlockId = typeof input?.beforeBlockId === "string" ? input.beforeBlockId.slice(0, 80) : "";
  if (!draftId || paragraph.length < 20) return NextResponse.json({ error: "이미지를 넣을 문단 내용을 확인해주세요(20자 이상)." }, { status: 400 });
  const supabase = await createClient();
  try {
    const { draft, state } = await readNodes(supabase, access.user.id, draftId);
    const slot = freeSlots(state.images)[0];
    if (!slot) return NextResponse.json({ error: "본문 이미지는 최대 3장입니다. 다른 이미지를 삭제한 뒤 넣어주세요." }, { status: 400 });
    const openaiKey = await resolveApiKey(supabase, access.user.id, "openai");
    if (!openaiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "문단에 맞는 장면을 정하려면 OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });
    const [visual] = await selectContentVisuals({
      apiKey: openaiKey, topic: draft.topic, title: draft.title, body: paragraph, count: 1, slots: [slot],
      exclude: state.images.map((image) => image.sentence), model: getUserOpenAIContentModel(access.user.user_metadata, input?.openaiModel),
    });
    const result = await changeNodes(supabase, access.user.id, draftId, ({ images, blocks }) => {
      if (images.some((image) => image.slot === slot)) return null; // 그 사이 다른 창에서 이 칸을 씀
      const node = { slot, sentence: visual.sentence, prompt: visual.prompt };
      // 저장된 블록에 그 문단이 있으면 그 앞, 없으면(아직 저장 안 한 새 문단) 기준 문장 위치
      const placed = placeNodeBlock(blocks, node, beforeBlockId || undefined);
      return { images: upsertNode(images, node), blocks: placed !== blocks ? placed : placeNodeBlock(blocks, node) };
    });
    if (!result.saved) return NextResponse.json({ error: "그 사이 다른 창에서 이미지가 추가됐습니다. 새로고침 후 다시 시도해 주세요." }, { status: 409 });
    return NextResponse.json({ image: result.state.images.find((image) => image.slot === slot), images: result.state.images, blocks: result.state.blocks });
  } catch (error) {
    const status = error instanceof NodeStoreError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "이 문단에 넣을 이미지를 준비하지 못했습니다." }, { status });
  }
}
