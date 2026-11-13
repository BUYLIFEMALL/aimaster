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

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 쇼핑몰 분양 안내
export default async function ResalePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { error, ok, msg } = await searchParams;
  const [user, sources] = await Promise.all([getCurrentUser(), getResaleSources()]);
  const mine = user ? await getMyResaleApplications(user.id) : [];
  const resaleStores = await getStoresByIds(mine.filter((a) => a.status === "approved" && a.store_id).map((a) => a.store_id as string));
  const approvedStores = mine.map((a) => ({ app: a, store: resaleStores.find((s) => s.id === a.store_id) ?? null }));
  const pending = mine.find((a) => a.status === "pending");

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
        <span>←</span>
        <span>처음 화면</span>
      </Link>

      {/* 히어로 배너 */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 sm:p-12 text-white shadow-xl border border-slate-800" data-resale-hero>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold tracking-wider text-blue-300">
            🏪 B2B PARTNERSHIP · 쇼핑몰 분양
          </span>
          <h1 className="mt-4 text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            내 이름의 쇼핑몰을 열고,<br />본사 상품을 팔아 마진을 받으세요
          </h1>
          <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-slate-300">
            상품 기획·재고 부담·포장 및 택배 발송은 본사와 공급사가 전담합니다. 분양자는 판매가를 직접 결정하고 마케팅에만 집중하시면 됩니다.
          </p>
          <div className="mt-8">
            <a href="#apply" className="inline-block btn-3d-blue px-6 py-3.5 text-sm font-bold shadow-lg">
              지금 분양 신청하기 ›
            </a>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      </section>

      {/* 4단계 프로세스 */}
      <section className="mt-10" data-resale-steps>
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">How It Works</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">쇼핑몰 분양 4단계 프로세스</h2>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-4">
          {[
            ["1", "📝", "분양 신청", "몰 이름과 주소(/s/이름)를 정해 간편하게 신청합니다."],
            ["2", "✅", "본사 승인", "본사 검토 후 승인되면 내 분양몰이 즉시 오픈됩니다."],
            ["3", "🛍️", "상품 담기", "본사 엄선 상품을 골라 내 판매가를 정합니다 (본사가 이상)."],
            ["4", "💰", "판매·정산", "구매 확정된 주문의 마진이 쌓이고 언제든 출금 신청합니다."],
          ].map(([n, icon, title, body]) => (
            <div key={n} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xl shadow-2xs border border-slate-100">
                {icon}
              </span>
              <p className="mt-3.5 text-sm font-bold text-slate-900">{n}. {title}</p>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 알아 두실 것 */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-sm shadow-xs" data-resale-rules>
        <h2 className="font-bold text-slate-900">알아 두실 것</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
          <li><b>마진</b> = 내 판매가 − 본사 판매가. 판매가는 본사 판매가 이상으로만 정할 수 있습니다.</li>
          <li><b>결제</b>는 본사 계좌·본사 카드 결제로 받고(판매·발송 주체는 본사), 마진은 구매 확정 뒤 분양자 장부에 쌓여 출금 신청으로 받습니다.</li>
          <li><b>품절·가격</b>은 본사 상품이 바뀌면 내 몰에도 자동으로 반영됩니다.</li>
          <li><b>이용 기간</b>은 본사가 정합니다(처음 {DEFAULT_RESALE_DAYS}일). 기간이 끝나면 새 주문을 받지 않습니다.</li>
          <li>반품·취소된 주문의 마진은 회수됩니다.</li>
        </ul>
      </section>

      {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {ok && <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg || "처리했습니다."}</p>}

      {/* 내 분양 신청 내역 */}
      {user && mine.length > 0 && (
        <section id="mine" className="mt-10 scroll-mt-6" data-resale-mine>
          <h2 className="text-xl font-black tracking-tight text-slate-900 mb-4">내 분양 신청 내역</h2>
          <ul className="space-y-3">
            {mine.map((a) => {
              const st = approvedStores.find((x) => x.app.id === a.id)?.store;
              const left = st ? resaleDaysLeft(st.resale_expires_at) : null;
              return (
                <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <b className="text-base text-slate-900">{a.name}</b>
                    <span className="text-xs font-medium text-slate-400">/s/{a.slug}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      a.status === "approved" ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80" :
                      a.status === "pending" ? "bg-amber-50 text-amber-800 border border-amber-200/80" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {RESALE_STATUS_LABEL[a.status]}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">{formatDateTime(a.created_at)} 신청</span>
                  </div>
                  {a.status === "rejected" && a.note && (
                    <p className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      반려 사유: {a.note}
                    </p>
                  )}
                  {a.status === "approved" && st && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">
                        {left === 0 ? "이용 기간이 끝났습니다 — 본사에 연장을 요청해 주세요." : `이용 기간 ${left}일 남음`}
                      </span>
                      <Link href={`/s/${st.slug}/admin`} className="btn-3d-dark px-3.5 py-1.5 text-xs">
                        내 분양몰 관리
                      </Link>
                      <Link href={`/s/${st.slug}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        손님 화면 보기
                      </Link>
                    </div>
                  )}
                  {a.status === "pending" && (
                    <form action={cancelResaleAction.bind(null, a.id)} className="mt-3">
                      <PendingButton pendingText="취소 중…" className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        신청 취소
                      </PendingButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 분양 신청 폼 */}
      <section id="apply" className="mt-10 scroll-mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs" data-resale-apply>
        <div className="mb-4 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Application Form</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">분양 신청서 작성</h2>
        </div>

        {sources.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 font-medium">지금은 분양 신청을 받는 몰이 없습니다.</p>
        ) : !user ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-600">AIMaster 회원으로 로그인하시면 바로 신청할 수 있습니다.</p>
            <Link href="/login?next=%2Fresale%23apply" className="mt-4 inline-block btn-3d-blue px-6 py-2.5 text-xs font-bold">
              로그인하고 신청하기
            </Link>
          </div>
        ) : pending ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <p className="font-bold">신청서가 접수되어 본사에서 확인 중입니다.</p>
            <p className="mt-1 text-xs">「{pending.name}」 신청이 승인되면 위 「내 분양 신청 내역」에 관리 버튼이 활성화됩니다.</p>
          </div>
        ) : (
          sources.map((src) => (
            <form key={src.id} action={applyResaleAction.bind(null, src.slug)} className="grid gap-4 text-sm sm:grid-cols-2" data-resale-form>
              <div className="sm:col-span-2 rounded-xl bg-blue-50/60 border border-blue-100 p-3 text-xs text-blue-900">
                분양 공급처: <b className="font-bold text-blue-950">{src.name}</b>의 검증된 상품을 내 몰에서 판매합니다.
              </div>
              <label className="block">
                <span className="text-xs font-bold text-slate-700">내 몰 이름 *</span>
                <input
                  name="name"
                  required
                  maxLength={40}
                  placeholder="예: 하나네 생활마켓"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700">몰 주소 *</span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400">/s/</span>
                  <input
                    name="slug"
                    required
                    maxLength={30}
                    pattern="[a-z0-9][a-z0-9\-]{2,29}"
                    placeholder="hana-market"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <span className="mt-1 block text-[11px] text-slate-400">영문 소문자·숫자·하이픈 3~30자</span>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700">연락처</span>
                <input
                  name="phone"
                  maxLength={30}
                  placeholder="010-0000-0000"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700">홍보할 채널</span>
                <input
                  name="channel"
                  maxLength={200}
                  placeholder="예: 인스타그램 @hana, 동네 맘카페"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-slate-700">신청 메모</span>
                <textarea
                  name="memo"
                  rows={3}
                  maxLength={500}
                  placeholder="본사에 전달하고 싶은 운영 계획이나 문의사항을 적어주세요."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </label>
              <label className="flex items-start gap-2.5 sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input type="checkbox" name="agree" className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-xs text-slate-600 leading-snug">
                  위 「알아 두실 것」(마진·결제·이용 기간·회수) 정책을 모두 확인하였으며 이에 동의합니다.
                </span>
              </label>
              <div className="sm:col-span-2 mt-2">
                <PendingButton pendingText="신청하는 중…" className="btn-3d-blue w-full sm:w-auto px-8 py-3 text-sm font-bold shadow-md">
                  분양 신청 제출
                </PendingButton>
              </div>
            </form>
          ))
        )}
      </section>
    </main>
  );
}
