import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, getStoreBySlug, isStoreStaff } from "@/lib/store";
import { missingRequired, readBusinessInfo } from "@/lib/businessInfo";

export const dynamic = "force-dynamic";

// 손님 화면 공통 틀 — 머리글(몰 이름·메뉴 자리)과 바닥글(사업자 표시 정보).
// 디자인은 나중에 주인님 시안을 테마로 입힌다(docs/mall/ARCHITECTURE.md §6). 지금은 기능 위주 기본 모양.
export default async function ShopLayout({ children, params }: { children: ReactNode; params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const [user, staff] = await Promise.all([getCurrentUser(), isStoreStaff(store.id)]);
  const info = readBusinessInfo(store.business_info);
  const missing = missingRequired(info);
  const base = `/s/${store.slug}`;

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
          <nav className="flex items-center gap-3 text-sm text-gray-600">
            {user ? <span className="hidden sm:inline">{user.email}</span> : <Link href={`/login?next=${encodeURIComponent(base)}`}>로그인</Link>}
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

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
