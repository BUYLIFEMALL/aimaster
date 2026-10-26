import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateTextWithGemini, parseJsonFromModelText } from "@/lib/ai/gemini";
import { buildCopyPrompt, productFacts } from "@/lib/ai/copyTonePrompt";
import { cleanCopy, toCopyTone } from "@/lib/detailBlocks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/**
 * v1.37(E3): 상품 문구 말투 5종 — 회원 본인 Gemini 키로 글 1회. 결과는 저장하지 않고 화면에서 복사만 한다.
 * 상품 정보에 없는 판매량·후기·임상·재촉 문구는 프롬프트로 막고, 결과에서도 그런 문장을 한 번 더 뺀다(cleanCopy).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const tone = toCopyTone(body?.tone);

  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) return NextResponse.json({ needsApiKey: true, error: "Gemini API 키가 없습니다. 설정에서 본인 키를 등록해 주세요." }, { status: 400 });

  const { data: product } = await supabase.from("shop_products").select("*").eq("id", params.id).eq("user_id", user.id).single();
  if (!product) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });

  try {
    const text = await generateTextWithGemini({ prompt: buildCopyPrompt(product, tone), apiKey });
    const result = cleanCopy(parseJsonFromModelText<unknown>(text), productFacts(product));
    if (!result.names.length && !result.body) return NextResponse.json({ error: "AI가 문구를 돌려주지 않았습니다. 다시 시도해 주세요." }, { status: 502 });
    await logProgramUsage({ userId: user.id, action: "copy_tone", metadata: { tone } });
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "문구 작성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
