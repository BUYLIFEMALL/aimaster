import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { getResaleCatalog, getResaleMirrors, getResaleStoresOf, getStoreResaleApplications, getStoresByIds } from "@/lib/resale-store";
import {
  addResaleProductsAction,
  decideResaleAction,
  removeResaleProductAction,
  setResaleOpenAction,
  setResalePeriodAction,
  setResalePriceAction,
} from "@/lib/resale-actions";
import { formatWon } from "@/lib/products";
import { DEFAULT_RESALE_DAYS, MIRROR_STATUS_LABEL, RESALE_STATUS_LABEL, resaleAccepting, resaleDaysLeft } from "@/lib/resale";
import { formatDateTime } from "@/lib/orders";
import PendingButton from "@/app/pending-button";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// T2-1 「분양」 — 본사(일반 몰): 분양 받기 켜기·신청 승인/반려·분양몰 이용 기간 / 분양몰: 분양자에게 원본 몰·남은 기간 안내
export default async function AdminResalePage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string; q?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg, q } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/resale`);
  if (!staff) return <NoPermission />;

  const notice = (
    <>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
    </>
  );

  // 분양몰 대표(분양자) 화면
  if (store.kind === "resale") {
    const [[source], mirrors, catalog] = await Promise.all([
      getStoresByIds(store.source_store_id ? [store.source_store_id] : []),
      getResaleMirrors(store.id),
      getResaleCatalog(store.id, q),
    ]);
    const left = resaleDaysLeft(store.resale_expires_at);
    return (
      <AdminShell slug={store.slug} storeName={store.name} active="/resale">
        {notice}
        <h2 className="text-lg font-semibold">🏪 내 분양몰</h2>
        <section className="mt-3 rounded-lg border p-4 text-sm" data-resale-self>
          <p>원본 몰: <b>{source?.name ?? "본사 몰"}</b> — 이 몰의 상품을 골라 내 판매가로 팝니다. 결제·발송은 본사가 맡습니다.</p>
          <p className={`mt-2 ${left === 0 ? "text-red-700" : "text-gray-700"}`} data-resale-period>
            {left === 0 ? "이용 기간이 끝나 지금은 새 주문을 받지 않습니다. 본사에 연장을 요청해 주세요." : `이용 기간: ${store.resale_expires_at ? formatDateTime(store.resale_expires_at) : "—"}까지 (${left}일 남음)`}
          </p>
        </section>

        <section id="mine" className="mt-6 scroll-mt-4" data-resale-mirrors>
          <h3 className="text-sm font-semibold">내 분양 상품 {mirrors.length}개</h3>
          {mirrors.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">아직 담은 상품이 없습니다. 아래 「본사 상품 담기」에서 골라 주세요.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {mirrors.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm" data-resale-mirror>
                  <Link href={`/s/${store.slug}/p/${m.id}`} className="min-w-0 flex-1 truncate font-medium underline">{m.name}</Link>
                  <span className={`rounded px-1.5 text-xs ${m.status === "on_sale" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{MIRROR_STATUS_LABEL[m.status] ?? m.status}</span>
                  <span className="text-xs text-gray-500">본사가 {m.source_price == null ? "—" : formatWon(m.source_price)} · 마진 {m.source_price == null ? "—" : formatWon(m.base_price - m.source_price)}</span>
                  <form action={setResalePriceAction.bind(null, store.slug, m.id)} className="flex items-center gap-1 text-xs">
                    <input name="price" inputMode="numeric" defaultValue={m.base_price} aria-label={`${m.name} 판매가`} className="w-24 rounded border px-2 py-1.5" />원
                    <PendingButton pendingText="저장 중…" className="min-h-10 rounded border px-2 py-1.5">판매가 저장</PendingButton>
                  </form>
                  <form action={removeResaleProductAction.bind(null, store.slug, m.id)}>
                    <PendingButton pendingText="빼는 중…" className="min-h-10 rounded border border-red-300 px-2 py-1.5 text-xs text-red-700">빼기</PendingButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="catalog" className="mt-6 scroll-mt-4 rounded-lg border p-4" data-resale-catalog>
          <h3 className="text-sm font-semibold">본사 상품 담기</h3>
          <p className="mt-1 text-xs text-gray-500">담으면 이름·사진·옵션·재고·품절이 본사 상품과 자동으로 맞춰집니다. 판매가는 본사가 이상으로 정하고, 차액이 내 마진입니다.</p>
          <form className="mt-2 flex gap-2" action={`/s/${store.slug}/admin/resale#catalog`}>
            <input name="q" defaultValue={q ?? ""} placeholder="상품 이름 검색" className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm" />
            <button className="min-h-10 rounded border px-3 text-sm">검색</button>
          </form>
          {catalog.error ? (
            <p className="mt-2 text-sm text-red-700">{catalog.error}</p>
          ) : catalog.rows.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">담을 수 있는 본사 상품이 없습니다.</p>
          ) : (
            <form action={addResaleProductsAction.bind(null, store.slug, store.id)} className="mt-3 space-y-2">
              <ul className="max-h-[480px] space-y-1 overflow-y-auto">
                {catalog.rows.map((c) => (
                  <li key={c.id}>
                    <label className={`flex items-center gap-2 rounded border p-2 text-sm ${c.added ? "bg-gray-50 text-gray-400" : ""}`}>
                      <input type="checkbox" name="ids" value={c.id} disabled={c.added} />
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="text-xs">{formatWon(c.base_price)}{c.option_count ? ` · 옵션 ${c.option_count}` : ""}{c.status === "sold_out" ? " · 품절" : ""}</span>
                      {c.added && <span className="text-xs">담음</span>}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label>처음 판매가 = 본사가 + <input name="markup" inputMode="numeric" defaultValue={20} className="w-14 rounded border px-2 py-1.5" />%</label>
                <PendingButton pendingText="담는 중…" className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white">고른 상품 담기</PendingButton>
              </div>
            </form>
          )}
        </section>
      </AdminShell>
    );
  }

  const [apps, resaleStores] = await Promise.all([getStoreResaleApplications(store.id), getResaleStoresOf(store.id)]);
  const pending = apps.filter((a) => a.status === "pending");
  const done = apps.filter((a) => a.status !== "pending").slice(0, 30);
  const accepting = resaleAccepting(store.modules);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/resale">
      {notice}
      <h2 className="text-lg font-semibold">🏪 분양</h2>
      <p className="mt-1 text-sm text-gray-600">회원이 이 몰의 상품을 자기 이름의 몰(분양몰)에서 팔 수 있게 합니다. 결제는 이 몰 계좌·카드로 받고, 분양자는 (판매가 − 이 몰 판매가)를 마진으로 받습니다.</p>

      <section className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border p-4 text-sm" data-resale-open>
        <span className={`rounded px-1.5 text-xs ${accepting ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{accepting ? "분양 신청 받는 중" : "분양 신청 안 받음"}</span>
        <span className="text-xs text-gray-500">공개 안내 화면: <Link href="/resale" className="text-blue-700 underline">/resale</Link></span>
        <form action={setResaleOpenAction.bind(null, store.slug, store.id, !accepting)} className="ml-auto">
          <PendingButton pendingText="바꾸는 중…" className="min-h-10 rounded border px-3 py-1.5 text-xs">{accepting ? "신청 그만 받기" : "분양 신청 받기"}</PendingButton>
        </form>
      </section>

      <section className="mt-6" data-resale-pending>
        <h3 className="text-sm font-semibold">승인 대기 신청 <b className={pending.length ? "text-red-700" : ""}>{pending.length}</b></h3>
        {pending.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">확인할 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="rounded border p-3 text-sm" data-resale-app>
                <p><b>{a.name}</b> <span className="text-xs text-gray-500">/s/{a.slug} · {formatDateTime(a.created_at)} 신청</span></p>
                <p className="mt-0.5 text-xs text-gray-600">연락처 {a.phone || "—"} · 홍보할 곳 {a.channel || "—"}</p>
                {a.memo && <p className="mt-0.5 text-xs text-gray-500">「{a.memo}」</p>}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decideResaleAction.bind(null, store.slug, a.id, "approve")} className="flex flex-wrap items-center gap-2" data-resale-approve>
                    <label className="text-xs">이용 기간 <input name="days" inputMode="numeric" defaultValue={DEFAULT_RESALE_DAYS} className="w-16 rounded border px-2 py-1.5" />일</label>
                    <PendingButton pendingText="승인 중…" className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">승인(분양몰 열기)</PendingButton>
                  </form>
                  <form action={decideResaleAction.bind(null, store.slug, a.id, "reject")} className="flex items-center gap-2" data-resale-reject>
                    <input name="note" maxLength={300} placeholder="반려 사유(신청자에게 보임)" className="rounded border px-2 py-1.5 text-xs" />
                    <PendingButton pendingText="반려 중…" className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700">반려</PendingButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6" data-resale-stores>
        <h3 className="text-sm font-semibold">분양몰 {resaleStores.length}곳</h3>
        {resaleStores.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">아직 열린 분양몰이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {resaleStores.map((r) => {
              const left = resaleDaysLeft(r.resale_expires_at);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm" data-resale-store>
                  <b>{r.name}</b>
                  <Link href={`/s/${r.slug}`} className="text-xs text-blue-700 underline">/s/{r.slug}</Link>
                  <span className={`rounded px-1.5 text-xs ${left ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{left ? `${left}일 남음` : "기간 끝남"}</span>
                  <form action={setResalePeriodAction.bind(null, store.slug, r.id)} className="ml-auto flex items-center gap-1 text-xs">
                    오늘부터 <input name="days" inputMode="numeric" defaultValue={DEFAULT_RESALE_DAYS} className="w-16 rounded border px-2 py-1.5" />일
                    <PendingButton pendingText="저장 중…" className="min-h-10 rounded border px-2 py-1.5">기간 저장</PendingButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-gray-600">처리한 신청 {done.length}건</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
            {done.map((a) => <li key={a.id}>{a.name} · /s/{a.slug} · {RESALE_STATUS_LABEL[a.status]}{a.note ? ` — ${a.note}` : ""} · {a.decided_at ? formatDateTime(a.decided_at) : ""}</li>)}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}
