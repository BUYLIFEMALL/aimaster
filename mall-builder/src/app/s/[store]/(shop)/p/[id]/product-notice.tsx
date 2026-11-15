// M2-4 유저 상품 화면 — 상품정보제공고시 표·KC 인증 표시(DB 0096). 값이 없으면 아무것도 그리지 않는다.
import { KC_NONE } from "@/lib/productNotice";
import { getProductNotice } from "@/lib/product-notice-server";

export default async function ProductNotice({ productId }: { productId: string }) {
  const { notice: n, kc: certs } = await getProductNotice(productId);
  if (!n && !certs.length) return null;
  const none = certs.length === 1 && certs[0].kind === KC_NONE;
  return (
    <div id="detail-notice" className="mt-12 scroll-mt-24" data-product-notice>
      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-sm">📋</span>
          <h2 className="text-lg font-black tracking-tight text-slate-900">상품정보제공고시</h2>
          {n && <span className="text-xs text-slate-500">({n.type})</span>}
        </div>
        {n && (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {n.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="w-2/5 bg-slate-50/70 px-3 py-2.5 text-left align-top font-medium text-slate-600 sm:w-1/3">{it.label}</th>
                  <td className="whitespace-pre-line px-3 py-2.5 text-slate-800">{it.value || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {certs.length > 0 && (
          <div className={`${n ? "mt-5" : ""} flex flex-wrap items-center gap-2 text-sm`} data-kc>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">KC</span>
            {none ? (
              <span className="text-slate-600">KC 인증 대상이 아닌 상품입니다.</span>
            ) : (
              certs.map((c, i) => (
                <span key={i} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-700">
                  {c.kind} <b className="font-mono">{c.no}</b>
                </span>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
