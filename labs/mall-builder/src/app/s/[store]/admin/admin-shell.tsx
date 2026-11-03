import Link from "next/link";
import type { ReactNode } from "react";

// 운영자 관리 화면 공통 틀 — 메뉴는 기능을 하나씩 만들 때마다 추가한다.
const MENU = [
  { href: "", label: "대시보드" },
  { href: "/settings", label: "쇼핑몰 정보" },
] as const;

export function AdminShell({ slug, storeName, active, children }: { slug: string; storeName: string; active: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500">← 내 쇼핑몰</Link>
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

export function NoPermission() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold">관리 권한이 없습니다</h1>
      <p className="mt-2 text-sm text-gray-600">이 몰의 운영자만 관리 화면을 열 수 있습니다.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
        내 쇼핑몰로 돌아가기
      </Link>
    </main>
  );
}
