import Link from "next/link";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { getMySupplier } from "@/lib/supplier-store";
import { updateSupplierSelfAction } from "@/lib/supplier-actions";
import { SUPPLIER_STATUS_LABEL } from "@/lib/supplier";
import { formatDateTime } from "@/lib/orders";
import LogoutButton from "@/app/logout-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D34 공급사 화면 — 공급사 본인만. 다음 단계에서 「내 상품」(D35)·「내 주문」(D36)·「정산」(D37)이 여기에 붙는다
export default async function SupplierHomePage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const user = await requireUser(`/s/${slug}/supplier`);
  const store = await getStoreBySlug(slug);
  const me = await getMySupplier(store.id, user.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
        <Link href="/">← 처음 화면</Link>
        <span className="truncate" title="지금 로그인한 계정">{user.email}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{store.name} · 공급사 화면</h1>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}

      {!me ? (
        <div className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-600" data-supplier-denied>
          <p>이 몰의 공급사 계정이 아닙니다. 몰 운영자에게 받은 초대 링크로 먼저 입점을 수락해 주세요.</p>
          <div className="mt-3"><LogoutButton label="다른 계정으로 로그인" /></div>
        </div>
      ) : (
        <>
          <section className="mt-6 rounded-lg border p-4 text-sm" data-supplier-me>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-base">{me.name}</b>
              <span className={`rounded px-1.5 text-xs ${me.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{SUPPLIER_STATUS_LABEL[me.status]}</span>
              {me.accepted_at && <span className="ml-auto text-xs text-gray-400">{formatDateTime(me.accepted_at)} 입점</span>}
            </div>
            {me.status === "paused" && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">운영자가 잠시 쉬게 해 두었습니다. 그동안 내 상품은 판매되지 않고 새 주문도 들어오지 않습니다.</p>}
            <p className="mt-2 text-xs text-gray-500">사업자등록번호 {me.biz_no || "—"} · 상호·사업자번호를 바꾸려면 몰 운영자에게 요청해 주세요.</p>
            <form action={updateSupplierSelfAction.bind(null, store.slug)} className="mt-3 flex flex-wrap items-end gap-2" data-supplier-self>
              <input name="contact_name" maxLength={30} defaultValue={me.contact_name} placeholder="담당자" className="rounded border px-2 py-2" />
              <input name="phone" maxLength={30} defaultValue={me.phone} placeholder="연락처" className="rounded border px-2 py-2" />
              <button className="min-h-11 rounded border px-3 py-2">담당자 저장</button>
            </form>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-3" data-supplier-menu>
            {[
              { t: "📦 내 상품", d: "상품을 올리면 운영자가 확인한 뒤 판매합니다." },
              { t: "🚚 내 주문", d: "내 상품이 팔리면 받는 사람·주소를 보고 송장을 입력합니다." },
              { t: "💰 정산", d: "구매 확정된 품목의 공급가가 쌓이고 운영자가 송금합니다." },
            ].map((m) => (
              <div key={m.t} className="rounded border p-3 text-sm">
                <p className="font-semibold">{m.t}</p>
                <p className="mt-1 text-xs text-gray-500">{m.d}</p>
                <p className="mt-2 text-xs text-gray-400">준비 중입니다.</p>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
