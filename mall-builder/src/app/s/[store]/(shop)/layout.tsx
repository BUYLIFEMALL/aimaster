import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { getCartCount, getCategoryRows, getCurrentUser, getMyCustomer, getPublishedDesign, getStoreBySlug, isStoreStaff } from "@/lib/store";
import { readTheme, themeStyle } from "@/lib/theme";
import { readFooter, readHeader } from "@/lib/builder/frame";
import { ShopBand, ShopFooter, ShopHeader } from "./shop-frame";
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
  const header = readHeader(design.header);
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
      className="flex min-h-screen flex-col overflow-x-clip bg-[var(--mall-bg,var(--color-slate-50))] font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white"
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

      {/* 네오 모던 B2B 헤더 — 디자인 빌더 D3: 로고·메뉴·검색 모양은 디자인 값(shop-frame.tsx) */}
      <ShopBand band={header.band} />
      <ShopHeader
        base={base}
        storeName={store.name}
        header={header}
        categories={topCategories.map((c) => ({ id: c.id, name: c.name }))}
        showShop={showShop}
        right={
          <>
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
          </>
        }
      />

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

      {/* 네오 모던 B2B 바닥글 — 사업자 정보는 잠금(shop-frame.tsx) */}
      <ShopFooter storeName={store.name} info={info} footer={readFooter(design.footer)} logo={header.logo_footer} />

      <PwaPrompt storeName={store.name} offer={shouldOfferInstall(customer)} />
      {!customer && <RefCatcher slug={store.slug} />}
    </div>
  );
}
