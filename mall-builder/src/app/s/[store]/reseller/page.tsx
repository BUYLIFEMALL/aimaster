import Link from "next/link";
import { getMyLinks, getMyRewards, getPayouts } from "@/lib/reseller-store";
import { requestPayoutAction } from "@/lib/reseller-actions";
import { NEWS_LABEL, PAYOUT_MIN, PAYOUT_STATUS_LABEL, defaultDeduction, recentNews } from "@/lib/reseller";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { ResellerShell, getResellerContext } from "./reseller-shell";
import LinkTools from "./link-tools";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M4-C1 리셀러 홈 — 수익 칸(지급 예정·보류·출금 가능·지급 완료 누계), 새 소식(M4-C3, 최근 7일 리워드 변화 — 화면 안 알림, 문자 없음), 내 링크, 출금 신청
export default async function ResellerHomePage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, summary: s, shopUrl, shortBase } = await getResellerContext(slug, `/s/${slug}/reseller`);
  const [{ rows, sum }, payouts, links] = await Promise.all([getMyRewards(s.id, 500), getPayouts(store.id, s.id, 5), getMyLinks(s.id)]);
  const news = recentNews(rows, new Date());
  const homeLink = links.get("home");
  const min = s.payout_min ?? PAYOUT_MIN;
  const canPayout = s.balance >= min && s.pending === 0;
  const card = "rounded-xl border bg-white p-4";
  return (
    <ResellerShell slug={store.slug} storeName={store.name} code={s.code} email={user.email ?? ""} active="" notice={notice}>
      <h1 className="text-xl font-bold">안녕하세요, 리셀러님 👋</h1>
      <p className="mt-1 text-sm text-slate-600">내 링크로 들어온 손님이 30일 안에 주문하면 상품마다 정해진 리워드가 쌓입니다. 구매 확정되면 출금할 수 있습니다.</p>

      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" data-reseller-earn>
        <div className={card}><p className="text-xs text-slate-500">지급 예정</p><p className="mt-1 text-lg font-bold text-amber-700">{formatWon(sum.pending)}</p><p className="text-[11px] text-slate-400">구매 확정되면 출금 가능</p></div>
        <div className={card}><p className="text-xs text-slate-500">보류</p><p className="mt-1 text-lg font-bold text-red-700">{formatWon(sum.held)}</p><p className="text-[11px] text-slate-400">확정 전 취소·반품, 운영자 확인 중</p></div>
        <div className={card}><p className="text-xs text-slate-500">출금 가능</p><p className="mt-1 text-lg font-bold text-emerald-700" data-reseller-balance>{formatWon(s.balance)}</p><p className="text-[11px] text-slate-400">처리 대기 {formatWon(s.pending)}</p></div>
        <div className={card}><p className="text-xs text-slate-500">지급 완료 누계</p><p className="mt-1 text-lg font-bold">{formatWon(sum.paid)}</p><p className="text-[11px] text-slate-400">이번 달 적립 {formatWon(s.month_earned)}</p></div>
      </section>

      <section className="mt-6" data-reseller-news>
        <h2 className="font-semibold">🔔 새 소식 <span className="text-xs font-normal text-slate-500">최근 7일</span></h2>
        {news.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">최근 7일 동안 바뀐 리워드가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {news.map((n, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2">
                <span className="min-w-0 truncate"><span className={`mr-1 rounded px-1.5 text-xs ${n.kind === "paid" ? "bg-emerald-50 text-emerald-800" : n.kind === "held" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{NEWS_LABEL[n.kind]}</span>{n.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatDateTime(n.at)} · <b className="text-slate-800">{formatWon(n.amount)}</b></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="link" className="mt-6 scroll-mt-4" data-reseller-link>
        <h2 className="font-semibold">🔗 내 링크</h2>
        <p className="mt-1 text-xs text-slate-500">몰 첫 화면 링크입니다. 상품마다 링크는 <Link href={`/s/${store.slug}/reseller/products`} className="underline">상품 고르기</Link>에서 복사하세요.</p>
        <div className="mt-2"><LinkTools url={shopUrl()} name={`${store.name}-몰`} short={{ slug: store.slug, productId: null, base: shortBase, key: homeLink?.key, clicks: homeLink?.clicks }} /></div>
      </section>

      <section className="mt-6" data-reseller-payout>
        <h2 className="font-semibold">💸 출금</h2>
        {canPayout ? (
          <form action={requestPayoutAction.bind(null, store.slug)} className="mt-2 grid gap-2 rounded-xl border bg-white p-3 sm:grid-cols-4" data-payout-form>
            <input type="hidden" name="back" value="reseller" />
            <input name="amount" inputMode="numeric" defaultValue={s.balance} aria-label="출금 금액" className="rounded border px-2 py-2" />
            <input name="bank_name" placeholder={s.saved_bank ? "은행(비우면 저장 계좌)" : "은행"} maxLength={30} className="rounded border px-2 py-2" />
            <input name="bank_account" placeholder="계좌번호" maxLength={40} className="rounded border px-2 py-2" />
            <input name="bank_holder" placeholder="예금주" maxLength={30} className="rounded border px-2 py-2" />
            <p className="text-xs text-slate-500 sm:col-span-3">
              {s.saved_bank && <>계좌 칸을 모두 비우면 저장 계좌 <b>{s.saved_bank}</b>로 받습니다. </>}
              {s.payee_type === "business" ? "사업자는 세금계산서로 정산하므로 신청 금액 그대로 이체됩니다." : <>개인은 사업소득 원천징수 3.3%를 빼고 이체됩니다(예: 공제 약 {formatWon(defaultDeduction(s.balance, s.payee_type))}).</>}
            </p>
            <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-white">출금 신청</button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{s.pending > 0 ? "처리 대기 중인 출금 신청이 있습니다." : `출금은 ${min.toLocaleString("ko-KR")}원 이상부터 신청할 수 있습니다.`}</p>
        )}
        {payouts.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
            {payouts.map((p) => (
              <li key={p.id}>{formatDateTime(p.requested_at)} · {formatWon(p.amount)} · <b>{PAYOUT_STATUS_LABEL[p.status]}</b>{p.status === "paid" && p.transfer_amount != null && ` (공제 ${formatWon(p.deduction ?? 0)} → 이체 ${formatWon(p.transfer_amount)})`}{p.reason && ` — ${p.reason}`}</li>
            ))}
          </ul>
        )}
      </section>
    </ResellerShell>
  );
}
