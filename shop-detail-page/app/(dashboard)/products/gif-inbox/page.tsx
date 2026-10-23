import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { GifInbox } from "@/components/products/GifInbox";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.28: 상세페이지 GIF 자동화에서 「🛍 상세페이지로」를 누르면 열리는 창. GIF를 받아 내 상품의 섹션에 넣는다.
export default async function GifInboxPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: products }, { data: templates }] = await Promise.all([
    supabase
      .from("shop_products")
      .select("id, product_label, name, layout_preset, section_sequence")
      .order("created_at", { ascending: false }),
    supabase
      .from("shop_prompt_templates")
      .select("id, section_key, section_name, section_order, layout_preset")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq("is_active", true)
      .order("section_order", { ascending: true }),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6"
      >
        <span>←</span>
        <span>상품 목록으로 돌아가기</span>
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 text-3xl mb-3 shadow-xs">
          🎞️
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">GIF 받기</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          상세페이지 GIF 자동화에서 보낸 움직이는 GIF를 내 상품의 섹션에 바로 넣습니다. 원래 이미지는 버전 목록에 남습니다.
        </p>
      </div>

      <GifInbox products={products ?? []} templates={templates ?? []} />
    </div>
  );
}
