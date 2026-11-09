import { getCategoryRows, getGrades, getStaffStore, getStoreCustomers, getStoreProducts } from "@/lib/store";
import { getPointSettings, getStoreCoupons } from "@/lib/benefits-store";
import { couponLabel, ISSUE_MODE_LABEL } from "@/lib/benefits";
import { createCouponAction, issueCouponAction, savePointSettingsAction, toggleCouponAction } from "@/lib/benefit-actions";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TARGET_LABEL = { all: "전체 상품", category: "카테고리", product: "상품" } as const;

// 운영자 쿠폰·포인트(D17·D18) — 포인트 설정(한 화면 3칸이면 시작), 쿠폰 만들기·켜고 끄기·직접 발급·사용 수
export default async function AdminCouponsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/coupons`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [settings, coupons, grades, categories, products, customers, { data: gradeRates }] = await Promise.all([
    getPointSettings(store.id),
    getStoreCoupons(store.id),
    getGrades(store.id),
    getCategoryRows(store.id),
    getStoreProducts(store.id),
    getStoreCustomers(store.id),
    supabase.from("mall_builder_customer_grades").select("id, point_rate").eq("store_id", store.id),
  ]);
  const rateOf = new Map(((gradeRates ?? []) as { id: string; point_rate: number | null }[]).map((g) => [g.id, g.point_rate]));
  const nameOf = new Map<string, string>([...categories.map((c) => [c.id, c.name] as [string, string]), ...products.map((p) => [p.id, p.name] as [string, string])]);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/coupons">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}

      <section className="rounded border p-4" data-point-settings>
        <h2 className="text-sm font-semibold">포인트 설정 {settings.enabled ? <span className="ml-1 rounded bg-gray-900 px-1.5 text-xs text-white">켜짐</span> : <span className="ml-1 rounded bg-gray-200 px-1.5 text-xs">꺼짐</span>}</h2>
        <p className="mt-1 text-xs text-gray-500">구매 확정 때 (배송비 뺀 결제 금액 × 적립률)만큼 자동 적립되고, 손님은 주문서에서 씁니다. 기간이 지나면 매일 자동 소멸되고 7일 전에 문자로 알립니다(주문 알림 문자를 켠 몰).</p>
        <form action={savePointSettingsAction.bind(null, store.slug)} className="mt-3 space-y-3 text-sm">
          <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} /> 포인트 쓰기</label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block"><span className="text-xs text-gray-500">기본 적립률(%)</span><input name="earn_rate" type="number" step="0.1" min={0} max={50} defaultValue={settings.earn_rate} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            <label className="block"><span className="text-xs text-gray-500">소멸 기간(개월)</span><input name="expire_months" type="number" min={1} max={60} defaultValue={settings.expire_months} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            <label className="flex items-end gap-2 pb-2"><input type="checkbox" name="expire_notice" defaultChecked={settings.expire_notice} /> 소멸 7일 전 문자</label>
          </div>
          <details>
            <summary className="cursor-pointer text-xs text-gray-600">고급 — 사용 규칙·등급별 적립률</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label className="block"><span className="text-xs text-gray-500">이 점수 이상 모이면 사용</span><input name="min_use" type="number" min={0} defaultValue={settings.min_use} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
              <label className="block"><span className="text-xs text-gray-500">사용 단위(점)</span><input name="use_unit" type="number" min={1} max={10000} defaultValue={settings.use_unit} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
              <label className="block"><span className="text-xs text-gray-500">상품 금액의 최대 사용 비율(%)</span><input name="max_use_rate" type="number" min={1} max={100} defaultValue={settings.max_use_rate} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3" data-grade-rates>
              {grades.map((g) => (
                <label key={g.id} className="block">
                  <span className="text-xs text-gray-500">{g.name} 적립률(%) — 비우면 기본</span>
                  <input name={`grade_rate_${g.id}`} type="number" step="0.1" min={0} max={50} defaultValue={rateOf.get(g.id) ?? ""} className="mt-0.5 w-full rounded border px-2 py-1.5" />
                </label>
              ))}
            </div>
          </details>
          <button className="rounded bg-gray-900 px-4 py-1.5 text-white">포인트 설정 저장</button>
        </form>
      </section>

      <section className="mt-6 rounded border p-4" data-new-coupon>
        <h2 className="text-sm font-semibold">새 쿠폰</h2>
        <form action={createCouponAction.bind(null, store.slug)} className="mt-3 space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block"><span className="text-xs text-gray-500">쿠폰 이름</span><input name="name" required maxLength={40} placeholder="예: 가입 축하 3천원" className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            <label className="block">
              <span className="text-xs text-gray-500">발급 방식</span>
              <select name="issue_mode" defaultValue="manual" className="mt-0.5 w-full rounded border px-2 py-1.5">
                {Object.entries(ISSUE_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">할인</span>
              <span className="mt-0.5 flex gap-2">
                <select name="discount_type" defaultValue="amount" className="rounded border px-2 py-1.5"><option value="amount">원</option><option value="rate">%</option></select>
                <input name="value" type="number" min={1} required placeholder="3000 또는 10" className="w-full rounded border px-2 py-1.5" />
              </span>
            </label>
            <label className="block"><span className="text-xs text-gray-500">최대 할인액(% 쿠폰만, 선택)</span><input name="max_discount" type="number" min={1} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            <label className="block"><span className="text-xs text-gray-500">최소 주문 금액(대상 상품 합)</span><input name="min_order" type="number" min={0} defaultValue={0} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            <label className="block"><span className="text-xs text-gray-500">쿠폰 코드(「쿠폰 코드」 방식만, 영문 대문자·숫자)</span><input name="code" maxLength={20} placeholder="WELCOME10" className="mt-0.5 w-full rounded border px-2 py-1.5 uppercase" /></label>
            <label className="block"><span className="text-xs text-gray-500">받은 날부터 사용 기간(일, 선택)</span><input name="valid_days" type="number" min={1} max={3650} placeholder="30" className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
            <label className="block"><span className="text-xs text-gray-500">마감일(선택)</span><input name="ends_at" type="date" className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-xs text-gray-500">적용 대상</legend>
            <div className="flex flex-wrap gap-3">
              <label><input type="radio" name="target" value="all" defaultChecked /> 전체 상품</label>
              <label><input type="radio" name="target" value="category" /> 아래에서 고른 카테고리</label>
              <label><input type="radio" name="target" value="product" /> 아래에서 고른 상품</label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="max-h-32 overflow-y-auto rounded border p-2" data-target-categories>
                <p className="mb-1 text-xs text-gray-500">카테고리</p>
                {categories.length === 0 && <p className="text-xs text-gray-400">카테고리가 없습니다.</p>}
                {categories.map((c) => <label key={c.id} className="block"><input type="checkbox" name="category_ids" value={c.id} /> {c.name}</label>)}
              </div>
              <div className="max-h-32 overflow-y-auto rounded border p-2" data-target-products>
                <p className="mb-1 text-xs text-gray-500">상품</p>
                {products.map((p) => <label key={p.id} className="block"><input type="checkbox" name="product_ids" value={p.id} /> {p.name}</label>)}
              </div>
            </div>
          </fieldset>
          <label className="flex items-center gap-2"><input type="checkbox" name="allow_business" /> 사업자 등급가와 같이 쓰기 <span className="text-xs text-gray-500">(끄면 승인 사업자는 이 쿠폰을 쓸 수 없음)</span></label>
          <p className="text-xs text-gray-500">가입 축하는 몰에 새로 가입할 때, 생일은 손님이 마이페이지에 생일을 넣어 두면 그날 자동으로 발급됩니다. 주문 한 건에 쿠폰은 1장, 배송비에는 적용되지 않습니다.</p>
          <button className="rounded bg-gray-900 px-4 py-1.5 text-white">쿠폰 만들기</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">쿠폰 목록 ({coupons.length})</h2>
        {coupons.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 쿠폰이 없습니다.</p>}
        <ul className="mt-2 divide-y rounded border text-sm" data-coupon-list>
          {coupons.map((c) => (
            <li key={c.id} className="px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 text-xs ${c.is_active ? "bg-gray-900 text-white" : "bg-gray-200"}`}>{c.is_active ? "켜짐" : "꺼짐"}</span>
                <b>{c.name}</b>
                <span className="text-gray-600">{couponLabel(c)}</span>
                <span className="rounded bg-gray-100 px-1.5 text-xs">{ISSUE_MODE_LABEL[c.issue_mode]}{c.code ? ` ${c.code}` : ""}</span>
                <span className="text-xs text-gray-500">
                  {TARGET_LABEL[c.target]}{c.target !== "all" ? `: ${c.target_ids.map((id) => nameOf.get(id) ?? "(지운 항목)").join(", ")}` : ""}
                  {c.allow_business ? " · 사업자 가능" : ""}
                  {c.valid_days ? ` · 받고 ${c.valid_days}일` : ""}
                  {c.ends_at ? ` · ~${new Date(c.ends_at).toLocaleDateString("ko-KR")}` : ""}
                </span>
                <span className="ml-auto text-xs text-gray-600" data-coupon-counts>발급 {c.issued} · 사용 {c.used}</span>
                <form action={toggleCouponAction.bind(null, store.slug, c.id, !c.is_active)}>
                  <button className="rounded border px-2 py-1 text-xs">{c.is_active ? "끄기" : "켜기"}</button>
                </form>
              </div>
              {c.issue_mode === "manual" && c.is_active && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-blue-700">발급하기</summary>
                  <form action={issueCouponAction.bind(null, store.slug, c.id)} className="mt-2 space-y-2 rounded bg-gray-50 p-3 text-sm" data-issue-form>
                    <div className="flex flex-wrap items-center gap-3">
                      <label><input type="radio" name="scope" value="all" defaultChecked /> 가입 손님 전체</label>
                      <label>
                        <input type="radio" name="scope" value="grade" /> 등급{" "}
                        <select name="grade_id" className="rounded border px-1 py-0.5">{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                      </label>
                      <label><input type="radio" name="scope" value="customers" /> 아래에서 고른 손님</label>
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded border bg-white p-2" data-issue-customers>
                      {customers.map((u) => <label key={u.id} className="block"><input type="checkbox" name="customer_ids" value={u.id} /> {u.name} <span className="text-xs text-gray-500">{u.grade?.name}</span></label>)}
                    </div>
                    <button className="rounded bg-gray-900 px-3 py-1 text-white">발급</button>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
