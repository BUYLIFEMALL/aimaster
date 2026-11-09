import Link from "next/link";
import type { ReactNode } from "react";
import { getCartCount, getCategoryRows, getCurrentUser, getMyCustomer, getStoreBySlug, isStoreStaff } from "@/lib/store";
import { missingRequired, readBusinessInfo } from "@/lib/businessInfo";
import { buildCategoryTree } from "@/lib/categories";
import { guestOrderEnabled } from "@/lib/guest";
import { readGuestCart } from "@/lib/guest-store";
import { headers } from "next/headers";
import { canEnterClosed, openWhileClosed, readClosed } from "@/lib/closed";

export const dynamic = "force-dynamic";

// 손님 화면 공통 틀 — 머리글(몰 이름·메뉴 자리)과 바닥글(사업자 표시 정보).
// 디자인은 나중에 주인님 시안을 테마로 입힌다(docs/mall/ARCHITECTURE.md §6). 지금은 기능 위주 기본 모양.
export default async function ShopLayout({ children, params }: { children: ReactNode; params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const [user, staff, categoryRows] = await Promise.all([getCurrentUser(), isStoreStaff(store.id), getCategoryRows(store.id)]);
  const customer = user ? await getMyCustomer(store.id, user.id) : null;
  const cartCount = customer && user ? await getCartCount(store.id, user.id) : 0;
  // 비회원 주문을 켠 몰(D15): 로그인 전에도 장바구니(쿠키)·주문 조회
  const guestOk = !user && guestOrderEnabled(store.settings);
  const guestCartCount = guestOk ? (await readGuestCart(store.slug)).length : 0;
  // 손님 메뉴에는 보이는 카테고리만(운영자로 보고 있어도 손님과 같게)
  const topCategories = buildCategoryTree(categoryRows, false);
  const info = readBusinessInfo(store.business_info);
  const missing = missingRequired(info);
  const base = `/s/${store.slug}`;
  // 폐쇄몰(D20): 승인 전이면 가입·마이페이지 말고는 안내 화면만. 상품·주문은 DB가 따로 막는다(0040)
  const closed = readClosed(store.settings);
  const canEnter = canEnterClosed(closed, staff, customer?.member_status);
  const gated = !canEnter && !openWhileClosed((await headers()).get("x-mb-path"), store.slug);
  const showShop = canEnter;

  return (
    <div className="flex min-h-screen flex-col">
      {staff && (
        <div className="bg-gray-900 px-4 py-2 text-center text-xs text-white">
          운영자로 보고 있습니다 · <Link href={`${base}/admin`} className="underline">관리 화면</Link>
          {missing.length > 0 && (
            <>
              {" "}· 바닥글에 빠진 사업자 정보 {missing.length}개 ·{" "}
              <Link href={`${base}/admin/settings`} className="underline">입력하기</Link>
            </>
          )}
        </div>
      )}

      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href={base} className="text-xl font-bold">{store.name}</Link>
          {/* 메뉴 자리: 카테고리(F03)·장바구니(F09)·로그인/마이페이지(F08)가 기능을 만들 때 하나씩 들어온다 */}
          {showShop && <form action={`${base}/search`} className="hidden flex-1 sm:block sm:max-w-xs">
            <input name="q" placeholder="상품 검색" maxLength={50} className="w-full rounded-full border px-4 py-1.5 text-sm" />
          </form>}
          <nav className="flex items-center gap-3 text-sm text-gray-600">
            {showShop && <Link href={`${base}/search`} className="sm:hidden" aria-label="검색">검색</Link>}
            {showShop && <Link href={`${base}/faq`} className="hidden sm:inline">FAQ</Link>}
            {!user ? (
              <>
                {guestOk && (
                  <>
                    <Link href={`${base}/cart`} data-cart-link>장바구니{guestCartCount ? ` ${guestCartCount}` : ""}</Link>
                    <Link href={`${base}/guest`}>주문 조회</Link>
                  </>
                )}
                <Link href={`/login?next=${encodeURIComponent(base)}`}>로그인</Link>
                <Link href={`${base}/join`}>가입</Link>
              </>
            ) : customer ? (
              <>
                {showShop && <Link href={`${base}/cart`} data-cart-link>장바구니{cartCount ? ` ${cartCount}` : ""}</Link>}
                <Link href={`${base}/my`}>{customer.name}님 · 마이페이지</Link>
              </>
            ) : (
              <Link href={`${base}/join`}>이 몰 가입하기</Link>
            )}
          </nav>
        </div>
        {showShop && topCategories.length > 0 && (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
            {topCategories.map((c) => (
              <Link key={c.id} href={`${base}/c/${c.id}`} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100">
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className="flex-1">
        {gated ? (
          <main className="mx-auto max-w-md px-4 py-16 text-center" data-closed-gate>
            <p className="text-4xl">🔒</p>
            <h1 className="mt-3 text-xl font-bold">회원 전용 몰입니다</h1>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{closed.notice || `${store.name}은(는) 승인된 회원만 상품을 보고 주문할 수 있습니다.`}</p>
            {customer ? (
              <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800" data-closed-status>
                {customer.member_status === "rejected"
                  ? `입장이 반려되었습니다${customer.member_reject_reason ? ` — ${customer.member_reject_reason}` : ""}.`
                  : "가입 신청을 받았습니다. 운영자가 승인하면 들어올 수 있습니다."}
                {closed.code && " 초대 코드가 있으면 마이페이지에서 바로 들어올 수 있습니다."}
              </p>
            ) : null}
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              {!user ? (
                <>
                  <Link href={`/login?next=${encodeURIComponent(base)}`} className="rounded bg-gray-900 px-4 py-2 text-white">로그인</Link>
                  <Link href={`${base}/join`} className="rounded border px-4 py-2">{closed.code ? "초대 코드로 가입" : "가입 신청"}</Link>
                </>
              ) : customer ? (
                <Link href={`${base}/my`} className="rounded border px-4 py-2">마이페이지</Link>
              ) : (
                <Link href={`${base}/join`} className="rounded bg-gray-900 px-4 py-2 text-white">{closed.code ? "초대 코드로 가입" : "가입 신청"}</Link>
              )}
            </div>
          </main>
        ) : (
          children
        )}
      </div>

      <footer className="border-t bg-gray-50">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 text-xs leading-relaxed text-gray-600">
          <p className="text-sm font-semibold text-gray-800">{info.company_name || store.name}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {info.ceo_name && <span>대표자 {info.ceo_name}</span>}
            {info.business_no && <span>사업자등록번호 {info.business_no}</span>}
            {info.mail_order_no && <span>통신판매업 신고 {info.mail_order_no}</span>}
          </p>
          {info.address && <p>주소 {info.address}</p>}
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {info.phone && <span>고객센터 {info.phone}</span>}
            {info.cs_hours && <span>({info.cs_hours})</span>}
            {info.email && <span>{info.email}</span>}
            {info.privacy_officer && <span>개인정보보호책임자 {info.privacy_officer}</span>}
          </p>
          {info.bank_name && info.bank_account && (
            <p>
              무통장 입금 {info.bank_name} {info.bank_account}
              {info.bank_holder && ` (예금주 ${info.bank_holder})`}
            </p>
          )}
          <p className="pt-2 text-gray-400">© {new Date().getFullYear()} {info.company_name || store.name}</p>
        </div>
      </footer>
    </div>
  );
}
