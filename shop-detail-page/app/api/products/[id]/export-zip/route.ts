import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { downloadImageAsBase64 } from "@/lib/storageImage";
import { buildStoredZip } from "@/lib/zipStore";
import { redirectToDownload, safeFileName, storeExport } from "@/lib/exportDownload";

const TARGET_WIDTH = 860;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * v1.21: 선택한 섹션 이미지를 가로 860px JPG로 맞춰 「01_섹션이름.jpg」 순서로 ZIP 하나에 묶는다.
 * 쿠팡·스마트스토어에 긴 한 장 대신 여러 장으로 올릴 때 쓴다. AI 호출 없음.
 * 결과는 회원 본인 상품 폴더(merged/)에 저장하고 서명 주소로 내려받게 한다(30일 정리 대상 폴더).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const user = access.user;
  const productId = params.id;

  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("shop_products")
    .select("id, product_label, name, language, layout_preset")
    .eq("id", productId)
    .single();
  if (productError || !product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const [{ data: images, error: imagesError }, { data: templates }] = await Promise.all([
    supabase
      .from("shop_product_images")
      .select("section_key, section_order, image_url")
      .eq("product_id", productId)
      .eq("language", product.language)
      .not("image_url", "is", null)
      .order("section_order", { ascending: true }),
    supabase
      .from("shop_prompt_templates")
      .select("section_key, section_name")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq("layout_preset", product.layout_preset ?? "shop15"),
  ]);

  if (imagesError || !images || images.length === 0) {
    return NextResponse.json({ error: "묶을 생성 이미지가 없습니다." }, { status: 400 });
  }

  const names = new Map((templates ?? []).map((t) => [t.section_key, t.section_name]));

  try {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const img of images) {
      let original: Buffer;
      try {
        original = Buffer.from((await downloadImageAsBase64(supabase, img.image_url as string)).base64, "base64");
      } catch {
        continue;
      }
      const jpg = await sharp(original)
        .resize({ width: TARGET_WIDTH })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      const label = safeFileName(names.get(img.section_key) ?? img.section_key).replace(/\s+/g, "_");
      files.push({ name: `${String(files.length + 1).padStart(2, "0")}_${label}.jpg`, data: jpg });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "이미지를 불러오지 못했습니다." }, { status: 400 });
    }

    const zip = buildStoredZip(files);
    const fileName = `${safeFileName(product.product_label || product.name || "product")}_sections_860px.zip`;
    const path = `${user.id}/products/${productId}/merged/${Date.now()}.zip`;

    const stored = await storeExport(supabase, path, zip, "application/zip");
    if (stored) {
      const redirect = await redirectToDownload(supabase, path, fileName);
      if (redirect) return redirect;
    }
    return NextResponse.json(
      { error: "ZIP 파일을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "ZIP 만들기 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
