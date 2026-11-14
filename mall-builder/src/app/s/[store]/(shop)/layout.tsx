import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { getCartCount, getCategoryRows, getCurrentUser, getMyCustomer, getPublishedDesign, getStoreBySlug, isStoreStaff } from "@/lib/store";
import { readTheme, themeStyle } from "@/lib/theme";
import { missingRequired, readBusinessInfo } from "@/lib/businessInfo";
import { buildCategoryTree } from "@/lib/categories";
import { guestOrderEnabled } from "@/lib/guest";
import { readGuestCart } from "@/lib/guest-store";
import { headers } from "next/headers";
import { canEnterClosed, openWhileClosed, readClosed } from "@/lib/closed";
import type { Metadata, Viewport } from "next";
import { APPLE_ICON_SIZE, EARLY_INSTALL_SCRIPT, iconColor, shouldOfferInstall } from "@/lib/pwa";
import PwaPrompt from "./pwa-prompt";
import RefCatcher from "./ref-catcher";
import { SAMPLE_MALL_SLUG } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

// D32 몰마다 제목·앱 설명 파일·아이폰 아이콘(홈 화면 설치)
export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  return {
    title: { default: store.name, template: `%s | ${store.name}` },
    description: `${store.name} 온라인 주문`,
    manifest: `/s/${store.slug}/manifest.webmanifest`,
    icons: { apple: `/s/${store.slug}/app-icon/${APPLE_ICON_SIZE}` },
    appleWebApp: { capable: true, title: store.name, statusBarStyle: "default" },
  };
}
export async function generateViewport({ params }: { params: Promise<{ store: string }> }): Promise<Viewport> {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  return { themeColor: iconColor(store.name) };
}

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 손님 화면 공통 틀
export default async function ShopLayout({ children, params }: { children: ReactNode; params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const [user, staff, categoryRows, design] = await Promise.all([getCurrentUser(), isStoreStaff(store.id), getCategoryRows(store.id), getPublishedDesign(store.id)]);
  // 디자인 빌더 D1: 몰 테마 → CSS 변수(기본 테마면 빈 객체 = 화면 그대로)
  const themeVars = themeStyle(readTheme(design.theme));
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
  const isSampleMall = store.slug === SAMPLE_MALL_SLUG;

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--mall-bg,var(--color-slate-50))] font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white"
      style={themeVars as CSSProperties}
    >
      <script dangerouslySetInnerHTML={{ __html: EARLY_INSTALL_SCRIPT }} />

      {/* S3 요청: 샘플몰 상단 고지 띠 */}
      {isSampleMall && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 py-2 text-center text-xs font-medium text-blue-100 shadow-inner">
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded bg-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-200">SAMPLE</span>
            이 몰은 샘플입니다 · 실제 결제·배송은 없습니다 · 사업자 신청을 하면 사업자 가격을 볼 수 있습니다
          </span>
        </div>
      )}

      {staff && (
        <div className="bg-slate-950 px-4 py-2 text-center text-xs text-slate-300">
          운영자로 보고 있습니다 · <Link href={`${base}/admin`} className="font-semibold text-blue-400 underline hover:text-blue-300">관리 화면</Link>
          {missing.length > 0 && (
            <>
              {" "}· 바닥글에 빠진 사업자 정보 {missing.length}개 ·{" "}
              <Link href={`${base}/admin/settings`} className="font-semibold text-amber-400 underline hover:text-amber-300">입력하기</Link>
            </>
          )}
        </div>
      )}

      {/* 네오 모던 B2B 헤더 */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href={base} className="group flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              {store.name.slice(0, 1)}
            </span>
            <span>{store.name}</span>
          </Link>

          {showShop && (
            <form action={`${base}/search`} className="hidden flex-1 sm:block sm:max-w-md">
              <div className="relative flex items-center">
                <input
                  name="q"
                  placeholder="원하시는 B2B 상품이나 규격을 검색하세요"
                  maxLength={50}
                  className="w-full rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                />
                <span className="pointer-events-none absolute left-3.5 text-slate-400 text-sm">🔍</span>
              </div>
            </form>
          )}

          <nav className="flex items-center gap-2.5 text-sm font-medium text-slate-600 sm:gap-4">
            {showShop && (
              <Link href={`${base}/search`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 sm:hidden" aria-label="검색">
                🔍
              </Link>
            )}
            {showShop && (
              <Link href={`${base}/faq`} className="hidden text-slate-600 hover:text-blue-600 sm:inline transition-colors">
                FAQ
              </Link>
            )}

            {!user ? (
              <>
                {guestOk && (
                  <>
                    <Link
                      href={`${base}/cart`}
                      data-cart-link
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span>장바구니</span>
                      {guestCartCount > 0 && (
                        <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[11px] font-bold text-white">
                          {guestCartCount}
                        </span>
                      )}
                    </Link>
                    <Link href={`${base}/guest`} className="text-slate-600 hover:text-blue-600 transition-colors">
                      주문 조회
                    </Link>
                  </>
                )}
                <Link
                  href={`/login?next=${encodeURIComponent(base)}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href={`${base}/join`}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  가입
                </Link>
              </>
            ) : customer ? (
              <>
                {showShop && (
                  <Link
                    href={`${base}/quick-order`}
                    data-quick-link
                    className="hidden rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 md:inline transition-colors"
                  >
                    ⚡ 빠른 주문
                  </Link>
                )}
                {showShop && (
                  <Link
                    href={`${base}/cart`}
                    data-cart-link
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span>장바구니</span>
                    {cartCount > 0 && (
                      <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[11px] font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  href={`${base}/my`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>{customer.name}님 · 마이페이지</span>
                </Link>
              </>
            ) : (
              <Link
                href={`${base}/join`}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                이 몰 가입하기
              </Link>
            )}
          </nav>
        </div>

        {/* 카테고리 네비게이션 탭 */}
        {showShop && topCategories.length > 0 && (
          <div className="border-t border-slate-100 bg-white">
            <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5 text-sm font-medium text-slate-600 scrollbar-none sm:px-6">
              <Link
                href={base}
                className="shrink-0 rounded-md px-3 py-1.5 text-slate-800 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                전체
              </Link>
              {topCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`${base}/c/${c.id}`}
                  className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* 본문 콘텐츠 */}
      <div className="flex-1">
        {gated ? (
          <main className="mx-auto my-16 max-w-md px-4 text-center" data-closed-gate>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600 shadow-inner">
                🔒
              </div>
              <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900">회원 전용 몰입니다</h1>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {closed.notice || `${store.name}은(는) 승인된 회원만 상품을 보고 주문할 수 있습니다.`}
              </p>
              {customer ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900" data-closed-status>
                  {customer.member_status === "rejected"
                    ? `입장이 반려되었습니다${customer.member_reject_reason ? ` — ${customer.member_reject_reason}` : ""}.`
                    : "가입 신청을 받았습니다. 운영자가 승인하면 들어올 수 있습니다."}
                  {closed.code && " 초대 코드가 있으면 마이페이지에서 바로 들어올 수 있습니다."}
                </p>
              ) : null}
              <div className="mt-6 flex items-center justify-center gap-3 text-sm font-semibold">
                {!user ? (
                  <>
                    <Link href={`/login?next=${encodeURIComponent(base)}`} className="btn-3d-dark px-5 py-2.5">
                      로그인
                    </Link>
                    <Link href={`${base}/join`} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors">
                      {closed.code ? "초대 코드로 가입" : "가입 신청"}
                    </Link>
                  </>
                ) : customer ? (
                  <Link href={`${base}/my`} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors">
                    마이페이지
                  </Link>
                ) : (
                  <Link href={`${base}/join`} className="btn-3d-blue px-5 py-2.5">
                    {closed.code ? "초대 코드로 가입" : "가입 신청"}
                  </Link>
                )}
              </div>
            </div>
          </main>
        ) : (
          children
        )}
      </div>

      {/* 네오 모던 B2B 바닥글 */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-6xl px-4 py-12 text-xs leading-relaxed sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3">
              <p className="text-base font-bold text-white tracking-tight">{info.company_name || store.name}</p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                {info.ceo_name && <span>대표자: {info.ceo_name}</span>}
                {info.business_no && <span>사업자등록번호: {info.business_no}</span>}
                {info.mail_order_no && <span>통신판매업 신고: {info.mail_order_no}</span>}
              </p>
              {info.address && <p className="text-slate-400">사업장 주소: {info.address}</p>}
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                {info.phone && <span>고객센터: {info.phone}</span>}
                {info.cs_hours && <span>({info.cs_hours})</span>}
                {info.email && <span>이메일: {info.email}</span>}
                {info.privacy_officer && <span>개인정보보호책임자: {info.privacy_officer}</span>}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-2">
              <p className="font-semibold text-slate-200">결제 및 고객 지원</p>
              {info.bank_name && info.bank_account ? (
                <p className="text-slate-300">
                  무통장 입금 계좌<br />
                  <b className="text-white text-sm">{info.bank_name} {info.bank_account}</b>
                  {info.bank_holder && <span className="block text-slate-400">예금주: {info.bank_holder}</span>}
                </p>
              ) : (
                <p className="text-slate-400">무통장 계좌는 주문서에서 안내됩니다.</p>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800/80 pt-6 flex flex-wrap items-center justify-between gap-2 text-slate-500">
            <p>© {new Date().getFullYear()} {info.company_name || store.name}. All rights reserved.</p>
            <p className="text-[11px]">B2B Commerce Powered by AIMaster Mall-Builder</p>
          </div>
        </div>
      </footer>

      <PwaPrompt storeName={store.name} offer={shouldOfferInstall(customer)} />
      {!customer && <RefCatcher slug={store.slug} />}
    </div>
  );
}
