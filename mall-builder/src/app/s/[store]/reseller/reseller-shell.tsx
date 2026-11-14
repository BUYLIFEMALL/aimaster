import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { getMyResellerSummary } from "@/lib/reseller-store";
import { mallSlugFromHost } from "@/lib/host";

// M4-C1 리셀러 화면 공통 틀 — PC는 왼쪽 메뉴, 휴대폰(767px 이하)은 아래쪽 탭 5개(홈·상품·판매·수익·메뉴)
// 휴대폰 아래쪽 탭은 5칸이라 「내 링크」는 PC 메뉴·홈에만(M4-C3에서 「판매」 추가)
const NAV = [
  { href: "", label: "홈", icon: "🏠", mobile: true },
  { href: "/products", label: "상품", icon: "🛍️", mobile: true },
  { href: "#link", label: "내 링크", icon: "🔗", mobile: false },
  { href: "/sales", label: "판매", icon: "📈", mobile: true },
  { href: "/earnings", label: "수익", icon: "💰", mobile: true },
  { href: "/menu", label: "메뉴", icon: "☰", mobile: true },
] as const;

/** 로그인 + 이 몰의 활동 중 리셀러 확인. 아니면 신청 화면으로 */
export async function getResellerContext(slug: string, path: string) {
  const user = await requireUser(path);
  const store = await getStoreBySlug(slug);
  const summary = await getMyResellerSummary(store.id);
  if (!summary || !summary.active) redirect(`/s/${store.slug}/reseller/apply`);
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const onSub = mallSlugFromHost(host, process.env.MALL_ROOT_DOMAIN) === store.slug;
  /** 유저에게 줄 주소 — 상품 경로(예: `/p/<id>`)를 넣으면 그 상품 링크 */
  const shopUrl = (sub = "") => `${proto}://${host}${onSub ? sub || "/" : `/s/${store.slug}${sub}`}?ref=${summary.code}`;
  /** 짧은 링크 앞부분(M4-C3) — 뒤에 7자 키를 붙이면 `/l/<키>` */
  const shortBase = `${proto}://${host}${onSub ? "" : `/s/${store.slug}`}/l/`;
  return { user, store, summary, shopUrl, shortBase };
}

export function ResellerShell({ slug, storeName, code, email, active, notice, children }: { slug: string; storeName: string; code: string; email: string; active: string; notice?: { error?: string; ok?: string; msg?: string }; children: ReactNode }) {
  const base = `/s/${slug}/reseller`;
  const href = (h: string) => (h.startsWith("#") ? `${base}${h}` : `${base}${h}`);
  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0" data-reseller-shell>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* PC 왼쪽 메뉴 */}
        <aside className="hidden w-52 shrink-0 md:block">
          <Link href={`/s/${slug}`} className="text-xs text-slate-500">← {storeName}</Link>
          <p className="mt-2 text-lg font-bold">🤝 리셀러</p>
          <p className="text-xs text-slate-500">코드 <b className="font-mono">{code}</b></p>
          <nav className="mt-4 space-y-1" data-reseller-side>
            {NAV.map((n) => (
              <Link key={n.href} href={href(n.href)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active === n.href ? "bg-slate-900 font-semibold text-white" : "text-slate-700 hover:bg-white"}`}>
                <span aria-hidden>{n.icon}</span>{n.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 truncate text-xs text-slate-400" title={email}>{email}</p>
        </aside>
        <main className="min-w-0 flex-1">
          {/* 휴대폰 위쪽 제목 */}
          <div className="mb-3 flex items-center justify-between md:hidden">
            <Link href={`/s/${slug}`} className="text-xs text-slate-500">← {storeName}</Link>
            <span className="text-xs text-slate-500">리셀러 <b className="font-mono">{code}</b></span>
          </div>
          {notice?.error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{notice.error}</p>}
          {notice?.ok && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice.msg || "처리했습니다."}</p>}
          {children}
        </main>
      </div>
      {/* 휴대폰 아래쪽 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-white md:hidden" data-reseller-tabbar>
        {NAV.filter((n) => n.mobile).map((n) => (
          <Link key={n.href} href={href(n.href)} className={`flex min-h-14 flex-col items-center justify-center text-[11px] ${active === n.href ? "font-semibold text-slate-900" : "text-slate-500"}`}>
            <span className="text-lg leading-none" aria-hidden>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
