import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/store";
import LogoutButton from "@/app/logout-button";

// 운영자 관리 화면 공통 틀 — 메뉴는 기능을 하나씩 만들 때마다 추가한다.
const MENU = [
  { href: "", label: "대시보드" },
  { href: "/orders", label: "주문" },
  { href: "/quotes", label: "견적" },
  { href: "/customers", label: "손님" },
  { href: "/settings", label: "쇼핑몰 정보" },
  { href: "/home", label: "첫 화면" },
  { href: "/notices", label: "공지" },
  { href: "/reviews", label: "후기" },
  { href: "/inquiries", label: "문의" },
  { href: "/faq", label: "FAQ" },
  { href: "/categories", label: "카테고리" },
  { href: "/products", label: "상품" },
  { href: "/shipping", label: "배송비" },
  { href: "/photos", label: "사진 정리" },
] as const;

export async function AdminShell({ slug, storeName, active, children }: { slug: string; storeName: string; active: string; children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
        <Link href="/">← 내 쇼핑몰</Link>
        <span className="truncate" title="지금 로그인한 계정">{user?.email}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{storeName} 관리</h1>
      <nav className="mt-4 flex gap-2 overflow-x-auto border-b">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={`/s/${slug}/admin${m.href}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active === m.href ? "border-gray-900 font-semibold" : "border-transparent text-gray-500"
            }`}
          >
            {m.label}
          </Link>
        ))}
        <Link href={`/s/${slug}`} className="ml-auto whitespace-nowrap px-3 py-2 text-sm text-blue-700">
          손님 화면 ↗
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
    </main>
  );
}

export async function NoPermission() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold">관리 권한이 없습니다</h1>
      <p className="mt-2 text-sm text-gray-600">이 몰의 운영자만 관리 화면을 열 수 있습니다.</p>
      <p className="mt-4 rounded bg-gray-50 px-3 py-2 text-sm">
        지금 로그인한 계정: <b>{user?.email}</b>
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/" className="text-sm text-blue-700 underline">내 쇼핑몰로 돌아가기</Link>
        <LogoutButton label="다른 계정으로 로그인" />
      </div>
    </main>
  );
}
