import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateTextWithGemini } from "@/lib/ai/gemini";
import { buildHtmlDetailPrompt, sanitizeGeneratedHtml, toHtmlTemplate } from "@/lib/ai/htmlDetailPrompt";
import { imageSrc } from "@/lib/imageSrc";
import { applySectionSequence } from "@/lib/sectionOrder";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * v1.17(이커머스 병합 E2): 이미 만든 섹션 이미지 + 상품 정보로 HTML 상세페이지를 작성한다(Gemini 텍스트 1회, 이미지 생성 없음).
 * 응답 한도(4.5MB) 때문에 이미지는 서버에서 넣지 않고 [IMAGE_N] 자리와 이미지 주소(/api/image) 목록을 돌려준다.
 * 브라우저가 이미지를 860px로 줄여 HTML 안에 넣고 파일로 내려받는다. 결과는 서버에 저장하지 않는다.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const user = access.user;
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const template = toHtmlTemplate(body?.template);

  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) {
    return NextResponse.json({ needsApiKey: true, error: "Gemini API 키가 없습니다. 설정에서 본인 키를 등록해 주세요." }, { status: 400 });
  }

  const { data: product } = await supabase.from("shop_products").select("*").eq("id", params.id).single();
  if (!product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: templates } = await supabase
    .from("shop_prompt_templates")
    .select("section_key, section_name, section_order")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq("is_active", true)
    .eq("layout_preset", product.layout_preset ?? "shop15")
    .order("section_order", { ascending: true });
  const { data: rows } = await supabase
    .from("shop_product_images")
    .select("section_key, image_url")
    .eq("product_id", product.id)
    .eq("language", product.language)
    .not("image_url", "is", null);

  const byKey = new Map((rows ?? []).map((r) => [r.section_key, r.image_url as string]));
  // v1.24: 회원이 정한 섹션 순서(section_sequence)를 따른다.
  const images = applySectionSequence(templates ?? [], product.section_sequence)
    .filter((t) => byKey.has(t.section_key))
    .map((t, i) => ({ placeholder: `[IMAGE_${i + 1}]`, sectionName: t.section_name, src: imageSrc(byKey.get(t.section_key)) }));
  if (images.length === 0) {
    return NextResponse.json({ error: "먼저 섹션 이미지를 한 장 이상 만들어 주세요." }, { status: 400 });
  }

  try {
    const text = await generateTextWithGemini({
      prompt: buildHtmlDetailPrompt({ template, product, images }),
      apiKey,
    });
    const html = sanitizeGeneratedHtml(text);
    if (!/<html[\s>]/i.test(html)) {
      return NextResponse.json({ error: "AI가 완성된 HTML을 돌려주지 않았습니다. 다시 시도해 주세요." }, { status: 502 });
    }
    await logProgramUsage({ userId: user.id, action: "export_detail_html", metadata: { template } });
    return NextResponse.json({
      html,
      images: images.map((i) => ({ placeholder: i.placeholder, src: i.src })),
      fileName: `${(product.product_label || product.name || "product").replace(/[/\\:*?"<>|]/g, "_")}_${template}_detail.html`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "HTML 작성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
