import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "임시저장",
  analyzing: "분석중",
  analyzed: "분석완료",
  generating: "생성중",
  completed: "완료",
  error: "에러",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  analyzing: "bg-blue-100 text-blue-700",
  analyzed: "bg-purple-100 text-purple-700",
  generating: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

export default async function ProductsPage() {
  await requireProgramAccess();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("shop_products")
    .select("id, product_label, name, category, source_image_url, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-1">내 상품 목록</h1>
            <p className="text-gray-500 text-sm">AI로 분석하고 상세페이지 이미지를 생성한 상품들이에요</p>
          </div>
          <Link
            href="/products/new"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all whitespace-nowrap"
          >
            + 새 상품
          </Link>
        </div>

        {(!products || products.length === 0) && (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
            <div className="text-4xl mb-3">🖼️</div>
            <p className="text-gray-500 mb-4">아직 등록한 상품이 없어요</p>
            <Link
              href="/products/new"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all"
            >
              첫 상품 등록하기
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {(products ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-50">
                {p.source_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.source_image_url}
                    alt={p.product_label ?? p.name ?? ""}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                  {p.product_label || p.name || "(이름 없음)"}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
    </div>
  );
}
