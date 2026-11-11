import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { listShopProducts, productName } from "@/lib/shop";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";

// 마지막 등록 결과 배지(등록 기록 elevenst_register_jobs — 본인 행만 읽힘, RLS)
const BADGE: Record<string, { text: string; cls: string }> = {
  stopped: { text: "🟠 등록됨·전시중지", cls: "bg-orange-50 text-orange-800" },
  registered: { text: "🟠 등록됨(전시 확인)", cls: "bg-amber-50 text-amber-900" },
  sending: { text: "⏳ 보내는 중", cls: "bg-slate-100 text-slate-700" },
  unknown: { text: "⚠ 확인 필요", cls: "bg-amber-50 text-amber-900" },
  failed: { text: "❌ 실패", cls: "bg-rose-50 text-rose-800" },
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProductsPage() {
  const user = await requireProgramAccess();
  const { rows, error } = await listShopProducts(user.id);
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("elevenst_register_jobs").select("product_id,status,elevenst_product_no,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300);
  const lastJob = new Map<string, { status: string; elevenst_product_no: number | null }>();
  for (const j of jobs ?? []) if (j.product_id && !lastJob.has(j.product_id)) lastJob.set(j.product_id, j);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📦" title="상품 등록" description="AI 상세페이지 자동화에서 만든 상품을 골라 11번가 등록 정보를 채우고, 검사한 뒤 11번가에 보냅니다." />
      <Notice tone="tip">💡 상세페이지에서 「검토 완료」한 상품이 위에 나옵니다. 상품을 누르면 카테고리 → 가격·옵션 → 배송 → 고시 → 검사 → 11번가에 보내기 순서로 진행합니다. 보내면 바로 전시중지해 두니, 셀러오피스에서 확인한 뒤 판매를 시작해 주세요.</Notice>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">상품 목록을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>}
      {!error && rows.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          아직 상세페이지 상품이 없습니다.{" "}
          <a href="https://shop-detail-page.buylife.xyz/products/new" className="font-bold text-indigo-700 underline">
            AI 상세페이지 자동화에서 상품 만들기 →
          </a>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300">
            <p className="font-bold text-slate-900">{productName(p)}</p>
            {lastJob.get(p.id) && BADGE[lastJob.get(p.id)!.status] && (
              <p className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-bold ${BADGE[lastJob.get(p.id)!.status].cls}`}>
                {BADGE[lastJob.get(p.id)!.status].text}
                {lastJob.get(p.id)!.elevenst_product_no ? ` · ${lastJob.get(p.id)!.elevenst_product_no}` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {p.reviewed_at ? "✅ 검토 완료" : "검토 전"} · {p.sale_price ? `${p.sale_price.toLocaleString()}원` : p.price ? `${p.price.toLocaleString()}원` : "가격 없음"}
              {p.category ? ` · ${p.category}` : ""} · {new Date(p.updated_at).toLocaleDateString("ko-KR")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
