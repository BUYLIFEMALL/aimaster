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

// BLC-10 (2026-10-22): 「빈 칸 이미지 구성」 — 목표 장수(2~6)까지 모자란 칸만 기준 문장·장면 설명을 정한다(글 AI 1회, 이미지는 만들지 않음).
// 이미 있는 노드·위치는 그대로. 이미지는 화면이 노드마다 /api/images/regenerate-content로 1장씩 만든다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string; count?: unknown; openaiModel?: unknown } | null;
  const draftId = input?.draftId?.trim() ?? "";
  const target = typeof input?.count === "number" && Number.isInteger(input.count) ? Math.min(6, Math.max(2, input.count)) : 2;
  if (!draftId) return NextResponse.json({ error: "본문 이미지를 넣을 원고를 먼저 선택해주세요." }, { status: 400 });
  const supabase = await createClient();
  try {
    const { draft, state } = await readNodes(supabase, access.user.id, draftId);
    const slots = freeSlots(state.images).slice(0, Math.max(0, target - state.images.length));
    if (!slots.length) return NextResponse.json({ images: state.images, blocks: state.blocks, added: [] });
    const openaiKey = await resolveApiKey(supabase, access.user.id, "openai");
    if (!openaiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "이미지를 넣을 문장을 고르려면 OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });
    const visuals = await selectContentVisuals({
      apiKey: openaiKey, topic: draft.topic, title: draft.title, body: draft.body, count: slots.length, slots,
      exclude: state.images.map((image) => image.sentence), model: getUserOpenAIContentModel(access.user.user_metadata, input?.openaiModel),
    });
    const result = await changeNodes(supabase, access.user.id, draftId, ({ images, blocks }) => {
      let nextImages = images; let nextBlocks = blocks;
      for (const visual of visuals) {
        if (images.some((image) => image.slot === visual.slot)) continue; // 그 사이 다른 창에서 채운 칸은 건너뜀
        nextImages = upsertNode(nextImages, { slot: visual.slot, sentence: visual.sentence, prompt: visual.prompt });
        nextBlocks = placeNodeBlock(nextBlocks, visual);
      }
      return { images: nextImages, blocks: nextBlocks };
    });
    const added = visuals.map((visual) => visual.slot).filter((slot) => !result.previous.images.some((image) => image.slot === slot));
    return NextResponse.json({ images: result.state.images, blocks: result.state.blocks, added });
  } catch (error) {
    const status = error instanceof NodeStoreError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "본문 이미지 구성을 정하지 못했습니다." }, { status });
  }
}
