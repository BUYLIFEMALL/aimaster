import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, getMyStores } from "@/lib/store";
import StoreSwitcher from "./store-switcher";
import LogoutButton from "@/app/logout-button";
import { createClient } from "@/lib/supabase/server";
import { canSeeMenu, type MyStaff } from "@/lib/staff";
import { APP_VERSION } from "@/lib/version";

// 운영자 관리 화면 공통 틀 — 좌측 메뉴(2026-11-14 주인님 지시: 「상단 메뉴를 좌측 메뉴로 수정해」, docs/SIDEBAR_LAYOUT_STANDARD.md)
// 넓은 화면: 왼쪽 메뉴 막대(몰 이름·버전 → 다른 프로그램 보기 → 메뉴 묶음 → 손님 화면 → 계정·로그아웃 바로 아래)
// 메뉴 안 스크롤바 없음(2026-11-14 주인님 「스크롤바 만들지마」) — 메뉴는 끝까지 펼치고 길면 페이지와 함께 내려감.
// 아래 여백 pb-20: 왼쪽 아래 고정 💾 저장공간 표시(storage-widget)가 로그아웃 단추를 가리지 않게
// 767px 이하: 왼쪽 막대를 숨기고 위쪽 ☰ 펼침 메뉴(같은 항목·같은 순서), 본문은 화면 전체 폭
// 메뉴 주소·이름·직원 권한 거르기(canSeeMenu)는 그대로. 기능을 새로 만들면 알맞은 묶음에 한 줄 추가한다.
// 묶음 순서(2026-11-14 주인님 지정): 상품 → 주문 → 손님 → 공급사 정산 → 몰 꾸미기 → 운영. 대시보드는 묶음 위 첫 줄.
const DASHBOARD = { href: "", label: "대시보드" } as const;
const MENU_GROUPS = [
  {
    title: "상품",
    tone: "border-amber-200 bg-amber-50/70 text-amber-700",
    items: [
      { href: "/products", label: "상품" },
      { href: "/categories", label: "카테고리" },
      { href: "/shipping", label: "배송비" },
    ],
  },
  {
    title: "주문",
    tone: "border-blue-200 bg-blue-50/70 text-blue-700",
    items: [
      { href: "/orders", label: "주문" },
      { href: "/quotes", label: "견적" },
      { href: "/recurring", label: "정기 주문" },
      { href: "/group-buys", label: "공동구매" },
    ],
  },
  {
    title: "손님",
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
    items: [
      { href: "/customers", label: "손님" },
      { href: "/grades", label: "등급·할인" },
      { href: "/coupons", label: "쿠폰·포인트" },
      { href: "/resellers", label: "리셀러" },
      { href: "/inquiries", label: "문의" },
      { href: "/reviews", label: "후기" },
      { href: "/restock", label: "재입고 알림" },
    ],
  },
  {
    title: "공급사 정산",
    tone: "border-rose-200 bg-rose-50/70 text-rose-700",
    items: [
      { href: "/suppliers", label: "공급사" },
      { href: "/supplier-settlements", label: "공급사 정산" },
    ],
  },
  {
    title: "몰 꾸미기",
    tone: "border-violet-200 bg-violet-50/70 text-violet-700",
    items: [
      { href: "/settings", label: "쇼핑몰 정보" },
      { href: "/design", label: "디자인 편집" },
      { href: "/home", label: "첫 화면" },
      { href: "/notices", label: "공지" },
      { href: "/faq", label: "FAQ" },
      { href: "/photos", label: "사진 정리" },
    ],
  },
  {
    title: "운영",
    tone: "border-slate-300 bg-slate-100/80 text-slate-600",
    items: [
      { href: "/resale", label: "분양" },
      { href: "/stats", label: "통계" },
      { href: "/staff", label: "직원" },
    ],
  },
] as const;

/** 메뉴 전체(순서대로) — 시험·다른 화면에서 쓰는 평평한 목록 */
export const MENU: { href: string; label: string }[] = [DASHBOARD, ...MENU_GROUPS.flatMap((g): { href: string; label: string }[] => [...g.items])];

type Group = { title: string; tone: string; items: readonly { href: string; label: string }[] };

function SideMenu({ slug, active, groups, email, dashboard }: { slug: string; active: string; groups: Group[]; email: string | undefined; dashboard: boolean }) {
  return (
    <>
      <nav aria-label="관리 메뉴">
        {dashboard && (
          <Link
            href={`/s/${slug}/admin`}
            aria-current={active === "" ? "page" : undefined}
            className={`mb-2 block rounded-xl border px-3 py-1.5 text-sm font-semibold ${active === "" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"}`}
          >
            🏠 {DASHBOARD.label}
          </Link>
        )}
        {groups.map((g) => (
          <div key={g.title} className={`mb-2 rounded-xl border p-1.5 ${g.tone}`} data-menu-group>
            <p className="px-2 pb-0.5 pt-0.5 text-[11px] font-bold tracking-wide">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((m) => (
                <li key={m.href}>
                  <Link
                    href={`/s/${slug}/admin${m.href}`}
                    aria-current={active === m.href ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1 text-sm ${
                      active === m.href ? "bg-gray-900 font-semibold text-white" : "text-gray-700 hover:bg-white/80"
                    }`}
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Link href={`/s/${slug}`} className="block rounded-lg px-3 py-1 text-sm text-blue-700 hover:bg-blue-50">
          손님 화면 ↗
        </Link>
      </nav>
      <div className="mt-2 shrink-0 border-t pt-3" data-admin-account>
        <p className="truncate px-1 text-xs text-gray-500" title="지금 로그인한 계정">{email}</p>
        <div className="mt-2 px-1">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}

export async function AdminShell({ slug, storeName, active, children }: { slug: string; storeName: string; active: string; children: ReactNode }) {
  const user = await getCurrentUser();
  // 직원 부계정(D22): 내 권한으로 메뉴를 거르고, 권한 없는 화면은 내용 대신 안내(돈·비밀값은 DB도 막음)
  const supabase = await createClient();
  const { data: storeRow } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  const me = storeRow ? (((await supabase.rpc("mall_builder_my_staff", { p_store_id: storeRow.id })).data ?? null) as MyStaff) : null;
  const groups: Group[] = MENU_GROUPS.map((g) => ({ title: g.title, tone: g.tone, items: g.items.filter((m) => canSeeMenu(m.href, me)) })).filter((g) => g.items.length > 0);
  const allowed = canSeeMenu(active, me);
  // D31 몰 여러 개 — 내가 대표·직원인 몰이 둘 이상이면 「다른 몰로」
  const myStores = user ? await getMyStores(user.id) : [];
  const switcher = myStores.length > 1 ? <StoreSwitcher current={slug} stores={myStores.map((s) => ({ slug: s.slug, name: s.name }))} /> : null;
  const heading = (
    <div>
      <p className="text-base font-bold leading-snug text-gray-900 [word-break:keep-all]">
        {storeName} <span className="whitespace-nowrap">관리</span>
      </p>
      <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">AI 쇼핑몰 빌더 {APP_VERSION}</span>
    </div>
  );
  const links = (
    <div className="space-y-1 text-xs">
      <a href="https://www.buylife.xyz/programs" className="block text-gray-500 hover:text-gray-900">← 다른 프로그램 보기</a>
      <Link href="/" className="block text-gray-500 hover:text-gray-900">← 내 쇼핑몰 목록</Link>
    </div>
  );

  return (
    <div className="min-h-screen md:flex" data-admin-shell>
      {/* 넓은 화면: 왼쪽 메뉴 막대 */}
      <aside className="hidden md:flex md:min-h-screen md:w-56 md:shrink-0 md:flex-col md:border-r md:bg-white md:px-3 md:pb-20 md:pt-5" data-admin-sidebar>
        <div className="shrink-0 space-y-3 px-1 pb-4">
          {heading}
          {switcher}
          {links}
        </div>
        <SideMenu slug={slug} active={active} groups={groups} email={user?.email} dashboard={canSeeMenu("", me)} />
      </aside>

      {/* 767px 이하: 위쪽 ☰ 펼침 메뉴 */}
      <details className="border-b bg-white md:hidden" data-admin-mobile-menu>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
          <span className="min-w-0 truncate text-sm font-bold">{storeName} 관리</span>
          <span className="shrink-0 rounded-lg border px-3 py-1.5 text-sm" aria-hidden>☰ 메뉴</span>
        </summary>
        <div className="flex flex-col px-3 pb-20">
          <div className="shrink-0 space-y-3 px-1 pb-3">
            <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">AI 쇼핑몰 빌더 {APP_VERSION}</span>
            {switcher}
            {links}
          </div>
          <SideMenu slug={slug} active={active} groups={groups} email={user?.email} dashboard={canSeeMenu("", me)} />
        </div>
      </details>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-4xl">
          {me && me.role !== "owner" && <p className="mb-4 text-xs text-gray-500" data-staff-badge>직원 계정으로 보고 있습니다 · 보이는 메뉴만 쓸 수 있습니다</p>}
          {allowed ? (
            children
          ) : (
            <p className="rounded border border-dashed p-8 text-center text-sm text-gray-600" data-staff-denied>
              이 메뉴를 쓸 권한이 없습니다. 대표 운영자에게 권한을 요청해 주세요.
            </p>
          )}
        </div>
      </main>
    </div>
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
