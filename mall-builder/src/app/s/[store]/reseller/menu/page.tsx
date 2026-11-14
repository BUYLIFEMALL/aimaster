import Link from "next/link";
import LogoutButton from "@/app/logout-button";
import { PAYOUT_MIN } from "@/lib/reseller";
import { formatWon } from "@/lib/products";
import { ResellerShell, getResellerContext } from "../reseller-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M4-C1 메뉴 — 내 리셀러 정보(코드·추가율·정산 방식·저장 계좌·최소 출금), 쇼핑몰·마이페이지 이동, 로그아웃
export default async function ResellerMenuPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { user, store, summary: s } = await getResellerContext(slug, `/s/${slug}/reseller/menu`);
  const row = "flex justify-between gap-3 border-b py-2.5 text-sm last:border-0";
  return (
    <ResellerShell slug={store.slug} storeName={store.name} code={s.code} email={user.email ?? ""} active="/menu">
      <h1 className="text-xl font-bold">☰ 메뉴</h1>
      <section className="mt-3 rounded-xl border bg-white px-4" data-reseller-info>
        <p className={row}><span className="text-slate-500">리셀러 코드</span><b className="font-mono">{s.code}</b></p>
        <p className={row}><span className="text-slate-500">내 추가 리워드율</span><b>{Number(s.rate)}%</b></p>
        <p className={row}><span className="text-slate-500">정산 방식</span><b>{s.payee_type === "business" ? "사업자(세금계산서)" : "개인(3.3% 원천징수)"}</b></p>
        <p className={row}><span className="text-slate-500">저장 계좌</span><b>{s.saved_bank ?? "없음(출금 때 입력)"}</b></p>
        <p className={row}><span className="text-slate-500">최소 출금</span><b>{formatWon(s.payout_min ?? PAYOUT_MIN)}</b></p>
      </section>
      <p className="mt-2 text-xs text-slate-500">정산 계좌·추가율을 바꾸려면 몰 운영자에게 문의해 주세요.</p>
      <nav className="mt-4 grid gap-2 text-sm">
        <Link href={`/s/${store.slug}`} className="rounded-xl border bg-white px-4 py-3">🏬 쇼핑몰로 가기</Link>
        <Link href={`/s/${store.slug}/my`} className="rounded-xl border bg-white px-4 py-3">👤 마이페이지(주문·내 정보)</Link>
      </nav>
      <div className="mt-4"><LogoutButton /></div>
      <p className="mt-2 truncate text-xs text-slate-400">{user.email}</p>
    </ResellerShell>
  );
}
