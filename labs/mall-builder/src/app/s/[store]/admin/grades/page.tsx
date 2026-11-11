import { getCategoryRows, getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { deleteGradeAction, saveCategoryRatesAction, saveGradeAction, saveMinMarginAction } from "@/lib/grade-actions";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type GradeRow = { id: string; code: string; name: string; rank: number; is_business: boolean; default_discount_rate: number };

// T1 「등급·할인」 — 등급(기본 할인율)·카테고리별 등급 할인율·최소 마진(공급가 하한)
// 우선순위: 공동구매가 > 거래처 특가 > 상품 예외(상품 수정 화면) > 카테고리 등급율(상위 카테고리 상속) > 등급 기본율 → 수량 할인 → 최저 판매가 보호
export default async function AdminGradesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/grades`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [{ data: gradeRows }, categoryRows, { data: rateRows }, { data: rule }, { data: counts }] = await Promise.all([
    supabase.from("mall_builder_customer_grades").select("id, code, name, rank, is_business, default_discount_rate").eq("store_id", store.id).order("rank"),
    getCategoryRows(store.id),
    supabase.from("mall_builder_category_grade_rates").select("category_id, grade_id, discount_rate").eq("store_id", store.id),
    supabase.from("mall_builder_price_rules").select("min_margin_rate").eq("store_id", store.id).maybeSingle(),
    supabase.from("mall_builder_store_customers").select("grade_id").eq("store_id", store.id),
  ]);
  const grades = (gradeRows ?? []) as GradeRow[];
  const cats = flattenTree(buildCategoryTree(categoryRows, true));
  const rate = new Map(((rateRows ?? []) as { category_id: string; grade_id: string; discount_rate: number }[]).map((r) => [`${r.category_id}_${r.grade_id}`, r.discount_rate]));
  const used = new Map<string, number>();
  for (const c of (counts ?? []) as { grade_id: string | null }[]) if (c.grade_id) used.set(c.grade_id, (used.get(c.grade_id) ?? 0) + 1);
  const isBase = (g: GradeRow) => g.code === "consumer" || g.code === "business";

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/grades">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "저장했습니다."}</p>}
      <h2 className="text-lg font-semibold">🏷️ 등급·할인</h2>
      <p className="mt-1 text-sm text-gray-600">손님 등급마다 실제 구입가를 다르게 합니다. 더 구체적인 것이 먼저 적용됩니다: <b>상품 예외</b>(상품 수정 화면의 등급가) → <b>카테고리 할인율</b>(상위 카테고리 값은 하위로 이어짐) → <b>등급 기본 할인율</b>. 그다음 수량 할인, 마지막으로 공급사 상품은 <b>최저 판매가</b> 밑으로 내려가지 않습니다.</p>

      <section className="mt-6" data-grades>
        <h3 className="text-sm font-semibold">등급 {grades.length}개</h3>
        <ul className="mt-2 space-y-2">
          {grades.map((g) => (
            <li key={g.id} className="rounded border p-3 text-sm" data-grade-row>
              <form action={saveGradeAction.bind(null, store.slug, g.id)} className="flex flex-wrap items-end gap-2">
                <label className="grid text-xs">이름<input name="name" required maxLength={20} defaultValue={g.name} className="w-28 rounded border px-2 py-1.5 text-sm" /></label>
                <label className="grid text-xs">구분
                  <select name="type" defaultValue={g.is_business ? "business" : "consumer"} disabled={isBase(g)} className="rounded border px-2 py-1.5 text-sm">
                    <option value="consumer">소비자</option><option value="business">사업자</option>
                  </select>
                  {isBase(g) && <input type="hidden" name="type" value={g.is_business ? "business" : "consumer"} />}
                </label>
                <label className="grid text-xs">순서<input name="rank" inputMode="numeric" defaultValue={g.rank} className="w-16 rounded border px-2 py-1.5 text-sm" /></label>
                <label className="grid text-xs">기본 할인율(%)<input name="default_rate" inputMode="numeric" defaultValue={g.default_discount_rate} className="w-20 rounded border px-2 py-1.5 text-sm" data-default-rate /></label>
                <button className="min-h-10 rounded border px-3 py-1.5 text-xs">저장</button>
                <span className="text-xs text-gray-500">{isBase(g) ? "기본 등급 · " : ""}손님 {used.get(g.id) ?? 0}명</span>
              </form>
              {!isBase(g) && (used.get(g.id) ?? 0) === 0 && (
                <form action={deleteGradeAction.bind(null, store.slug, g.id)} className="mt-1"><button className="text-xs text-red-700 underline">이 등급 지우기</button></form>
              )}
            </li>
          ))}
        </ul>
        <form action={saveGradeAction.bind(null, store.slug, null)} className="mt-3 flex flex-wrap items-end gap-2 rounded border border-dashed p-3 text-sm" data-grade-new>
          <label className="grid text-xs">새 등급 이름<input name="name" required maxLength={20} placeholder="예: 도매상" className="w-28 rounded border px-2 py-1.5 text-sm" /></label>
          <label className="grid text-xs">구분<select name="type" defaultValue="business" className="rounded border px-2 py-1.5 text-sm"><option value="consumer">소비자</option><option value="business">사업자</option></select></label>
          <label className="grid text-xs">순서<input name="rank" inputMode="numeric" defaultValue={(grades.at(-1)?.rank ?? 0) + 10} className="w-16 rounded border px-2 py-1.5 text-sm" /></label>
          <label className="grid text-xs">기본 할인율(%)<input name="default_rate" inputMode="numeric" defaultValue={0} className="w-20 rounded border px-2 py-1.5 text-sm" /></label>
          <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">등급 추가</button>
        </form>
        <p className="mt-1 text-xs text-gray-500">가입하면 「일반」, 사업자 승인을 받으면 「사업자」 등급이 됩니다. 다른 등급은 손님 상세 화면에서 바꿔 주세요(사업자 등급은 승인된 사업자만).</p>
      </section>

      <section id="category-rates" className="mt-8 scroll-mt-4" data-category-rates>
        <h3 className="text-sm font-semibold">카테고리별 등급 할인율(%)</h3>
        <p className="mt-1 text-xs text-gray-500">비워 두면 상위 카테고리 값, 그것도 없으면 등급 기본 할인율을 씁니다. 상품이 여러 카테고리에 있으면 큰 할인율을 씁니다.</p>
        {cats.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">카테고리가 없습니다. 「카테고리」 메뉴에서 먼저 만들어 주세요.</p>
        ) : (
          <form action={saveCategoryRatesAction.bind(null, store.slug)} className="mt-2">
            <div className="overflow-x-auto rounded border">
              <table className="w-full min-w-[480px] text-sm">
                <thead><tr className="border-b bg-gray-50 text-left text-xs text-gray-500"><th className="px-2 py-2">카테고리</th>{grades.map((g) => <th key={g.id} className="px-2 py-2 text-center">{g.name}<span className="block font-normal">기본 {g.default_discount_rate}%</span></th>)}</tr></thead>
                <tbody>
                  {cats.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-1.5" style={{ paddingLeft: `${(c.depth - 1) * 16 + 8}px` }}>{c.depth > 1 && "└ "}{c.name}</td>
                      {grades.map((g) => (
                        <td key={g.id} className="px-2 py-1.5 text-center">
                          <input name={`rate_${c.id}_${g.id}`} inputMode="numeric" defaultValue={rate.get(`${c.id}_${g.id}`) ?? ""} aria-label={`${c.name} ${g.name} 할인율`} className="w-14 rounded border px-1.5 py-1 text-center" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="mt-2 min-h-10 rounded bg-gray-900 px-4 py-1.5 text-xs text-white">카테고리 할인율 저장</button>
          </form>
        )}
      </section>

      <section id="margin" className="mt-8 scroll-mt-4" data-min-margin>
        <h3 className="text-sm font-semibold">최저 판매가(공급사 상품)</h3>
        <p className="mt-1 text-xs text-gray-500">어떤 등급 할인·수량 할인·특가를 적용해도 공급사 상품은 「공급가 × (1 + 최소 마진)」 밑으로 팔리지 않습니다. 몰 자체 상품에는 적용되지 않습니다.</p>
        <form action={saveMinMarginAction.bind(null, store.slug)} className="mt-2 flex items-end gap-2 text-sm">
          <label className="grid text-xs">최소 마진(%)<input name="min_margin" inputMode="decimal" defaultValue={rule?.min_margin_rate ?? 0} className="w-24 rounded border px-2 py-1.5 text-sm" /></label>
          <button className="min-h-10 rounded border px-3 py-1.5 text-xs">저장</button>
          <span className="text-xs text-gray-500">예: 공급가 10,000원·최소 마진 5% → 10,500원 밑으로 안 팔림</span>
        </form>
      </section>
    </AdminShell>
  );
}
