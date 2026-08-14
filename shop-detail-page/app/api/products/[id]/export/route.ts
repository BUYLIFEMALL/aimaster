import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

const TARGET_WIDTH = 860;

/** n8n #6(이미지병합) 대응: GraphicsMagick CLI 대신 sharp로 섹션 이미지를 세로로 병합한다. */
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
    .select("id, product_label, name, language, user_id")
    .eq("id", productId)
    .single();
  if (productError || !product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: images, error: imagesError } = await supabase
    .from("shop_product_images")
    .select("section_key, section_order, image_url")
    .eq("product_id", productId)
    .eq("language", product.language)
    .not("image_url", "is", null)
    .order("section_order", { ascending: true });

  if (imagesError || !images || images.length === 0) {
    return NextResponse.json({ error: "병합할 생성 이미지가 없습니다." }, { status: 400 });
  }

  try {
    const resizedBuffers: { buffer: Buffer; height: number }[] = [];
    for (const img of images) {
      const res = await fetch(img.image_url as string);
      if (!res.ok) continue;
      const original = Buffer.from(await res.arrayBuffer());
      const resized = sharp(original).resize({ width: TARGET_WIDTH });
      const buffer = await resized.png().toBuffer();
      const metadata = await sharp(buffer).metadata();
      resizedBuffers.push({ buffer, height: metadata.height ?? 0 });
    }

    if (resizedBuffers.length === 0) {
      return NextResponse.json({ error: "이미지를 불러오지 못했습니다." }, { status: 400 });
    }

    const totalHeight = resizedBuffers.reduce((sum, r) => sum + r.height, 0);

    let offsetY = 0;
    const composites = resizedBuffers.map(({ buffer, height }) => {
      const item = { input: buffer, top: offsetY, left: 0 };
      offsetY += height;
      return item;
    });

    const merged = await sharp({
      create: {
        width: TARGET_WIDTH,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    const fileName = `${(product.product_label || product.name || "product").replace(/[/\\:*?"<>|]/g, "_")}_merged_detail.png`;
    const path = `${user.id}/products/${productId}/merged/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("shop-detail-images")
      .upload(path, merged, { contentType: "image/png", upsert: false });
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from("shop-detail-images").getPublicUrl(path);
      await supabase.from("shop_page_exports").insert({
        product_id: productId,
        user_id: user.id,
        language: product.language,
        image_url: publicUrlData.publicUrl,
      });
    }

    return new NextResponse(new Uint8Array(merged), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 병합 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
