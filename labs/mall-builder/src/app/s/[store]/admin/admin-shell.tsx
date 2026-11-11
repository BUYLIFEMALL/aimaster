import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, getMyStores } from "@/lib/store";
import StoreSwitcher from "./store-switcher";
import LogoutButton from "@/app/logout-button";
import { createClient } from "@/lib/supabase/server";
import { canSeeMenu, type MyStaff } from "@/lib/staff";

// 운영자 관리 화면 공통 틀 — 메뉴는 기능을 하나씩 만들 때마다 추가한다.
const MENU = [
  { href: "", label: "대시보드" },
  { href: "/orders", label: "주문" },
  { href: "/quotes", label: "견적" },
  { href: "/recurring", label: "정기 주문" },
  { href: "/customers", label: "손님" },
  { href: "/coupons", label: "쿠폰·포인트" },
  { href: "/resellers", label: "리셀러" },
  { href: "/stats", label: "통계" },
  { href: "/settings", label: "쇼핑몰 정보" },
  { href: "/home", label: "첫 화면" },
  { href: "/notices", label: "공지" },
  { href: "/reviews", label: "후기" },
  { href: "/inquiries", label: "문의" },
  { href: "/faq", label: "FAQ" },
  { href: "/categories", label: "카테고리" },
  { href: "/products", label: "상품" },
  { href: "/suppliers", label: "공급사" },
  { href: "/group-buys", label: "공동구매" },
  { href: "/restock", label: "재입고 알림" },
  { href: "/shipping", label: "배송비" },
  { href: "/photos", label: "사진 정리" },
  { href: "/staff", label: "직원" },
] as const;

export async function AdminShell({ slug, storeName, active, children }: { slug: string; storeName: string; active: string; children: ReactNode }) {
  const user = await getCurrentUser();
  // 직원 부계정(D22): 내 권한으로 메뉴를 거르고, 권한 없는 화면은 내용 대신 안내(돈·비밀값은 DB도 막음)
  const supabase = await createClient();
  const { data: storeRow } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  const me = storeRow ? (((await supabase.rpc("mall_builder_my_staff", { p_store_id: storeRow.id })).data ?? null) as MyStaff) : null;
  const menu = MENU.filter((m) => canSeeMenu(m.href, me));
  const allowed = canSeeMenu(active, me);
  // D31 몰 여러 개 — 내가 대표·직원인 몰이 둘 이상이면 「다른 몰로」
  const myStores = user ? await getMyStores(user.id) : [];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
        <Link href="/">← 내 쇼핑몰</Link>
        <span className="truncate" title="지금 로그인한 계정">{user?.email}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{storeName} 관리</h1>
        {myStores.length > 1 && <StoreSwitcher current={slug} stores={myStores.map((s) => ({ slug: s.slug, name: s.name }))} />}
      </div>
      <nav className="mt-4 flex gap-2 overflow-x-auto border-b">
        {menu.map((m) => (
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
      {me && me.role !== "owner" && <p className="mt-2 text-xs text-gray-500" data-staff-badge>직원 계정으로 보고 있습니다 · 보이는 메뉴만 쓸 수 있습니다</p>}
      <div className="mt-6">
        {allowed ? (
          children
        ) : (
          <p className="rounded border border-dashed p-8 text-center text-sm text-gray-600" data-staff-denied>
            이 메뉴를 쓸 권한이 없습니다. 대표 운영자에게 권한을 요청해 주세요.
          </p>
        )}
      </div>
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
