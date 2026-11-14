import Link from "next/link";
import { getShopProducts } from "@/lib/store";
import { getMyProductRates } from "@/lib/reseller-store";
import { formatWon } from "@/lib/products";
import { ResellerShell, getResellerContext } from "../reseller-shell";
import LinkTools from "../link-tools";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SORTS = [
  { id: "all", label: "전체" },
  { id: "reward", label: "리워드 높은 순" },
  { id: "new", label: "신상품" },
] as const;

// M4-C2 상품 고르기 — 판매 중 상품마다 판매가·내 리워드율(상품율 + 내 추가율, 0077)·예상 리워드, 상품 링크 복사·QR
export default async function ResellerProductsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ sort?: string; q?: string }> }) {
  const { store: slug } = await params;
  const { sort: rawSort, q } = await searchParams;
  const sort = SORTS.find((x) => x.id === rawSort)?.id ?? "all";
  const { user, store, summary: s, shopUrl } = await getResellerContext(slug, `/s/${slug}/reseller/products`);
  const [products, rates] = await Promise.all([getShopProducts(store.id, { limit: 300, q: q?.trim() || undefined }), getMyProductRates(store.id)]);
  const rows = products
    .filter((p) => p.status === "on_sale" && !p.display.priceHidden)
    .map((p) => {
      const rate = rates.get(p.id)?.total ?? 0;
      return { p, rate, reward: Math.floor((p.display.unitPrice * rate) / 100) };
    });
  if (sort === "reward") rows.sort((a, b) => b.reward - a.reward || b.rate - a.rate);
  if (sort === "new") rows.sort((a, b) => Date.parse(b.p.created_at) - Date.parse(a.p.created_at));
  const base = `/s/${store.slug}/reseller/products`;
  return (
    <ResellerShell slug={store.slug} storeName={store.name} code={s.code} email={user.email ?? ""} active="/products">
      <h1 className="text-xl font-bold">🛍️ 상품 고르기</h1>
      <p className="mt-1 text-sm text-slate-600">상품 링크를 복사해 블로그·SNS·채팅에 올리세요. 링크로 들어온 손님이 30일 안에 사면 「예상 리워드」만큼 쌓입니다(실제는 결제 금액 기준, 쿠폰 할인 나눔 반영).</p>
      <form className="mt-3 flex gap-2" action={base}>
        <input type="hidden" name="sort" value={sort} />
        <input name="q" defaultValue={q ?? ""} placeholder="상품 이름 검색" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
        <button className="rounded-lg border bg-white px-3 py-2 text-sm">검색</button>
      </form>
      <nav className="mt-3 flex gap-1 text-xs" data-reseller-sort>
        {SORTS.map((x) => (
          <Link key={x.id} href={`${base}?sort=${x.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full border px-3 py-1.5 ${sort === x.id ? "bg-slate-900 text-white" : "bg-white"}`}>{x.label}</Link>
        ))}
        <span className="ml-auto self-center text-slate-500">{rows.length}개</span>
      </nav>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">조건에 맞는 상품이 없습니다.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-reseller-products>
          {rows.map(({ p, rate, reward }) => (
            <li key={p.id} className="flex gap-3 rounded-xl border bg-white p-3" data-reseller-product>
              {p.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0].url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/s/${store.slug}/p/${p.id}`} className="line-clamp-2 text-sm font-medium">{p.name}</Link>
                <p className="mt-0.5 text-sm font-semibold">{formatWon(p.display.unitPrice)}</p>
                <p className="text-xs">
                  <span className={`rounded px-1.5 ${rate > 0 ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>리워드 {rate}%</span>{" "}
                  <span className="text-slate-600" data-reward-estimate>예상 {formatWon(reward)}</span>
                </p>
                <div className="mt-1.5"><LinkTools url={shopUrl(`/p/${p.id}`)} name={p.name} compact /></div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ResellerShell>
  );
}
