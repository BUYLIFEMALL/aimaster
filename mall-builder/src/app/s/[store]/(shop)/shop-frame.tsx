import Link from "next/link";
import type { ReactNode } from "react";
import type { BusinessInfo } from "@/lib/businessInfo";
import type { FooterDesign, HeaderDesign, MenuLink } from "@/lib/builder/frame";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 손님 화면 틀(띠·헤더·바닥글)
// 데이터만 받아 그린다 — 손님 화면 틀(layout.tsx)과 디자인 편집기 미리보기가 같이 쓴다(디자인 빌더 D3).
// 디자인 값이 비어 있으면(DEFAULT_HEADER·DEFAULT_FOOTER) 지금 모양 그대로다.

function MaybeLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (!href) return <span className={className}>{children}</span>;
  const external = href.startsWith("https://");
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** 사이트 전체 맨 위 띠(문구가 있을 때만) */
export function ShopBand({ band }: { band: HeaderDesign["band"] }) {
  if (!band.text) return null;
  return (
    <div className="px-4 py-2 text-center text-xs font-semibold text-white" style={{ backgroundColor: band.bg }} data-shop-band>
      <MaybeLink href={band.link} className="text-white hover:underline">
        {band.text}
      </MaybeLink>
    </div>
  );
}

function NavLink({ item, className }: { item: MenuLink; className: string }) {
  return (
    <MaybeLink href={item.link} className={className}>
      {item.label}
    </MaybeLink>
  );
}

/** 헤더 — right: 로그인·장바구니·마이페이지 단추(손님 상태에 따라 틀이 넣는다) */
export function ShopHeader({ base, storeName, header, categories, showShop, right }: {
  base: string; storeName: string; header: HeaderDesign; categories: { id: string; name: string }[]; showShop: boolean; right: ReactNode;
}) {
  const cats = header.show_categories ? categories : [];
  const navCls = "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors";
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href={base} className="group flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl" data-shop-logo>
          {header.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={header.logo} alt={storeName} className="h-9 w-auto max-w-[200px] object-contain sm:h-10" />
          ) : (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-xs group-hover:bg-blue-700 transition-colors">
                {storeName.slice(0, 1)}
              </span>
              <span>{storeName}</span>
            </>
          )}
        </Link>

        {showShop && header.search === "box" && (
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
          {showShop && header.search !== "none" && (
            <Link
              href={`${base}/search`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 ${header.search === "box" ? "sm:hidden" : ""}`}
              aria-label="검색"
            >
              🔍
            </Link>
          )}
          {right}
        </nav>
      </div>

      {/* 카테고리 + 운영자 메뉴(2단까지 — 큰 화면은 마우스를 올리면 아래 메뉴, 휴대폰은 윗 메뉴만) */}
      {showShop && (cats.length > 0 || header.menu.length > 0) && (
        <div className="border-t border-slate-100 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5 text-sm font-medium text-slate-600 scrollbar-none md:overflow-visible sm:px-6" data-shop-menu>
            {header.show_categories && (
              <Link href={base} className="shrink-0 rounded-md px-3 py-1.5 text-slate-800 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                전체
              </Link>
            )}
            {cats.map((c) => (
              <Link key={c.id} href={`${base}/c/${c.id}`} className={navCls}>
                {c.name}
              </Link>
            ))}
            {header.menu.map((m, i) =>
              m.children.length ? (
                <div key={i} className="group relative shrink-0">
                  <NavLink item={m} className={`${navCls} inline-flex items-center gap-1`} />
                  <ul className="invisible absolute left-0 top-full z-50 min-w-40 rounded-xl border border-slate-200 bg-white py-1.5 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 max-md:hidden">
                    {m.children.map((c, j) => (
                      <li key={j}>
                        <NavLink item={c} className="block whitespace-nowrap px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <NavLink key={i} item={m} className={navCls} />
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/** 바닥글 — 사업자(판매자) 정보는 법정 표시라 디자인 값과 상관없이 늘 보인다(잠금) */
export function ShopFooter({ storeName, info, footer, logo }: { storeName: string; info: BusinessInfo; footer: FooterDesign; logo: string }) {
  const name = info.company_name || storeName;
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-400">
      <div className="mx-auto max-w-6xl px-4 py-12 text-xs leading-relaxed sm:px-6">
        {footer.columns.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-6 border-b border-slate-800/80 pb-8 sm:grid-cols-3" data-footer-columns>
            {footer.columns.map((c, i) => (
              <div key={i}>
                {c.title && <p className="mb-2 font-semibold text-slate-200">{c.title}</p>}
                <ul className="space-y-1.5">
                  {c.links.map((l, j) => (
                    <li key={j}>
                      <MaybeLink href={l.link} className="text-slate-400 hover:text-white transition-colors">
                        {l.label}
                      </MaybeLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className={`grid gap-8 ${footer.show_bank ? "md:grid-cols-3" : ""}`}>
          <div className="md:col-span-2 space-y-3" data-footer-business>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={name} className="h-8 w-auto max-w-[180px] object-contain" />
            ) : (
              <p className="text-base font-bold text-white tracking-tight">{name}</p>
            )}
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
            {footer.note && <p className="whitespace-pre-line text-slate-400" data-footer-note>{footer.note}</p>}
          </div>

          {footer.show_bank && (
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
          )}
        </div>

        <div className="mt-8 border-t border-slate-800/80 pt-6 flex flex-wrap items-center justify-between gap-2 text-slate-500">
          <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
          <p className="text-[11px]">B2B Commerce Powered by AIMaster Mall-Builder</p>
        </div>
      </div>
    </footer>
  );
}
