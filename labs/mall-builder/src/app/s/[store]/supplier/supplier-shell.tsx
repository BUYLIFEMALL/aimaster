import Link from "next/link";
import type { ReactNode } from "react";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { getMySupplier } from "@/lib/supplier-store";
import type { SupplierRow } from "@/lib/supplier";
import LogoutButton from "@/app/logout-button";

// D35 공급사 화면 공통 틀 — 로그인·공급사 확인, 위쪽 메뉴(내 정보·내 상품). D36·D37에서 내 주문·정산이 붙는다
const MENU = [
  { href: "", label: "내 정보" },
  { href: "/products", label: "내 상품" },
] as const;

export async function getSupplierContext(slug: string, path: string) {
  const user = await requireUser(path);
  const store = await getStoreBySlug(slug);
  const me = await getMySupplier(store.id, user.id);
  return { user, store, me };
}

export function SupplierShell({ slug, storeName, email, active, notice, children }: { slug: string; storeName: string; email: string; active: string; notice?: { error?: string; ok?: string; msg?: string }; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
        <Link href="/">← 처음 화면</Link>
        <span className="truncate" title="지금 로그인한 계정">{email}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{storeName} · 공급사 화면</h1>
      <nav className="mt-4 flex gap-2 overflow-x-auto border-b" data-supplier-nav>
        {MENU.map((m) => (
          <Link key={m.href} href={`/s/${slug}/supplier${m.href}`} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active === m.href ? "border-gray-900 font-semibold" : "border-transparent text-gray-500"}`}>
            {m.label}
          </Link>
        ))}
      </nav>
      {notice?.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{notice.error}</p>}
      {notice?.ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{notice.msg || "처리했습니다."}</p>}
      <div className="mt-6">{children}</div>
    </main>
  );
}

export function NotSupplier() {
  return (
    <div className="rounded border border-dashed p-8 text-center text-sm text-gray-600" data-supplier-denied>
      <p>이 몰의 공급사 계정이 아닙니다. 몰 운영자에게 받은 초대 링크로 먼저 입점을 수락해 주세요.</p>
      <div className="mt-3"><LogoutButton label="다른 계정으로 로그인" /></div>
    </div>
  );
}

export type SupplierMe = SupplierRow;
