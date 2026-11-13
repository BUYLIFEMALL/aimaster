import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/store";
import { getMyResaleApplications, getResaleSources, getStoresByIds } from "@/lib/resale-store";
import { applyResaleAction, cancelResaleAction } from "@/lib/resale-actions";
import { DEFAULT_RESALE_DAYS, RESALE_STATUS_LABEL, resaleDaysLeft } from "@/lib/resale";
import { formatDateTime } from "@/lib/orders";
import PendingButton from "@/app/pending-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = {
  title: "쇼핑몰 분양 — 내 이름의 쇼핑몰로 본사 상품 판매",
  description: "상품·재고·발송 걱정 없이 내 이름의 쇼핑몰을 분양받아 본사 상품을 팔고, 판매가와 본사가의 차이를 마진으로 받습니다.",
};

// T2-1 분양 안내·신청(공개) — 누구나 안내를 보고, 로그인한 회원은 신청·내 신청 상태를 본다
export default async function ResalePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { error, ok, msg } = await searchParams;
  const [user, sources] = await Promise.all([getCurrentUser(), getResaleSources()]);
  const mine = user ? await getMyResaleApplications(user.id) : [];
  const resaleStores = await getStoresByIds(mine.filter((a) => a.status === "approved" && a.store_id).map((a) => a.store_id as string));
  const approvedStores = mine.map((a) => ({ app: a, store: resaleStores.find((s) => s.id === a.store_id) ?? null }));
  const pending = mine.find((a) => a.status === "pending");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-gray-500">← 처음 화면</Link>

      <section className="mt-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-6 text-white sm:p-8" data-resale-hero>
        <p className="text-sm text-gray-300">🏪 쇼핑몰 분양</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">내 이름의 쇼핑몰을 열고,<br />본사 상품을 팔아 마진을 받으세요</h1>
        <p className="mt-3 text-sm text-gray-200">상품·재고·포장·발송은 본사와 공급사가 맡습니다. 분양자는 상품을 골라 판매가를 정하고 홍보만 하면 됩니다.</p>
        <a href="#apply" className="mt-5 inline-block min-h-11 rounded bg-white px-5 py-2.5 text-sm font-semibold text-gray-900">분양 신청하기</a>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-4" data-resale-steps>
        {[
          ["1", "📝", "분양 신청", "몰 이름·주소를 정해 신청합니다."],
          ["2", "✅", "본사 승인", "승인되면 내 분양몰이 바로 열립니다."],
          ["3", "🛍️", "상품 담기", "본사 상품을 골라 판매가를 정합니다(본사가 이상)."],
          ["4", "💰", "판매·정산", "구매 확정된 주문의 마진이 쌓이고 출금 신청합니다."],
        ].map(([n, icon, title, body]) => (
          <div key={n} className="rounded-lg border p-4 text-sm">
            <p className="text-2xl">{icon}</p>
            <p className="mt-2 font-semibold">{n}. {title}</p>
            <p className="mt-1 text-xs text-gray-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-lg border p-4 text-sm" data-resale-rules>
        <h2 className="font-semibold">알아 두실 것</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
          <li><b>마진</b> = 내 판매가 − 본사 판매가. 판매가는 본사 판매가 이상으로만 정할 수 있습니다.</li>
          <li><b>결제</b>는 본사 계좌·본사 카드 결제로 받고(판매·발송 주체는 본사), 마진은 구매 확정 뒤 분양자 장부에 쌓여 출금 신청으로 받습니다.</li>
          <li><b>품절·가격</b>은 본사 상품이 바뀌면 내 몰에도 자동으로 반영됩니다.</li>
          <li><b>이용 기간</b>은 본사가 정합니다(처음 {DEFAULT_RESALE_DAYS}일). 기간이 끝나면 새 주문을 받지 않습니다.</li>
          <li>반품·취소된 주문의 마진은 회수됩니다.</li>
        </ul>
      </section>

      {error && <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mt-6 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}

      {user && mine.length > 0 && (
        <section id="mine" className="mt-8 scroll-mt-4" data-resale-mine>
          <h2 className="text-lg font-semibold">내 분양 신청</h2>
          <ul className="mt-2 space-y-2">
            {mine.map((a) => {
              const st = approvedStores.find((x) => x.app.id === a.id)?.store;
              const left = st ? resaleDaysLeft(st.resale_expires_at) : null;
              return (
                <li key={a.id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{a.name}</b>
                    <span className="text-xs text-gray-500">/s/{a.slug}</span>
                    <span className={`rounded px-1.5 text-xs ${a.status === "approved" ? "bg-emerald-50 text-emerald-800" : a.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{RESALE_STATUS_LABEL[a.status]}</span>
                    <span className="ml-auto text-xs text-gray-400">{formatDateTime(a.created_at)} 신청</span>
                  </div>
                  {a.status === "rejected" && a.note && <p className="mt-1 text-xs text-red-700">반려 사유: {a.note}</p>}
                  {a.status === "approved" && st && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-600">{left === 0 ? "이용 기간이 끝났습니다 — 본사에 연장을 요청해 주세요." : `이용 기간 ${left}일 남음`}</span>
                      <Link href={`/s/${st.slug}/admin`} className="min-h-10 rounded bg-gray-900 px-3 py-2 text-xs text-white">내 분양몰 관리</Link>
                      <Link href={`/s/${st.slug}`} className="min-h-10 rounded border px-3 py-2 text-xs">손님 화면</Link>
                    </div>
                  )}
                  {a.status === "pending" && (
                    <form action={cancelResaleAction.bind(null, a.id)} className="mt-2">
                      <PendingButton pendingText="취소 중…" className="min-h-10 rounded border px-3 py-1.5 text-xs">신청 취소</PendingButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section id="apply" className="mt-8 scroll-mt-4 rounded-lg border p-4" data-resale-apply>
        <h2 className="text-lg font-semibold">분양 신청</h2>
        {sources.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">지금은 분양 신청을 받는 몰이 없습니다.</p>
        ) : !user ? (
          <div className="mt-2 text-sm">
            <p className="text-gray-600">AIMaster 회원으로 로그인하면 신청할 수 있습니다.</p>
            <Link href="/login?next=%2Fresale%23apply" className="mt-3 inline-block min-h-11 rounded bg-gray-900 px-5 py-2.5 text-white">로그인하고 신청하기</Link>
          </div>
        ) : pending ? (
          <p className="mt-2 text-sm text-gray-600">「{pending.name}」 신청을 본사가 확인하고 있습니다. 승인되면 위 「내 분양 신청」에 내 분양몰 버튼이 생깁니다.</p>
        ) : (
          sources.map((src) => (
            <form key={src.id} action={applyResaleAction.bind(null, src.slug)} className="mt-3 grid gap-3 text-sm sm:grid-cols-2" data-resale-form>
              <p className="sm:col-span-2 text-xs text-gray-500">분양받을 몰: <b className="text-gray-800">{src.name}</b>의 상품을 판매합니다.</p>
              <label className="block">
                <span className="font-medium">내 몰 이름 *</span>
                <input name="name" required maxLength={40} placeholder="예: 하나네 생활마켓" className="mt-1 w-full rounded border px-2 py-2" />
              </label>
              <label className="block">
                <span className="font-medium">몰 주소 *</span>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs text-gray-500">/s/</span>
                  <input name="slug" required maxLength={30} pattern="[a-z0-9][a-z0-9\-]{2,29}" placeholder="hana-market" className="w-full rounded border px-2 py-2" />
                </div>
                <span className="mt-1 block text-xs text-gray-500">영문 소문자·숫자·하이픈 3~30자</span>
              </label>
              <label className="block">
                <span className="font-medium">연락처</span>
                <input name="phone" maxLength={30} placeholder="010-0000-0000" className="mt-1 w-full rounded border px-2 py-2" />
              </label>
              <label className="block">
                <span className="font-medium">홍보할 곳</span>
                <input name="channel" maxLength={200} placeholder="예: 인스타그램 @hana, 동네 맘카페" className="mt-1 w-full rounded border px-2 py-2" />
              </label>
              <label className="block sm:col-span-2">
                <span className="font-medium">하고 싶은 말</span>
                <textarea name="memo" rows={3} maxLength={500} className="mt-1 w-full rounded border px-2 py-2" />
              </label>
              <label className="flex items-start gap-2 sm:col-span-2">
                <input type="checkbox" name="agree" className="mt-1" />
                <span className="text-xs text-gray-600">위 「알아 두실 것」(마진·결제·이용 기간·회수)을 확인했고 동의합니다.</span>
              </label>
              <div className="sm:col-span-2">
                <PendingButton pendingText="신청하는 중…" className="min-h-11 rounded bg-gray-900 px-5 py-2.5 text-white">분양 신청</PendingButton>
              </div>
            </form>
          ))
        )}
      </section>
    </main>
  );
}
