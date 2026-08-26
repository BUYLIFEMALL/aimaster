"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Search, PenSquare, FileText, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/blog/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/blog/candidates", icon: Search, label: "게시글 주제 수집" },
  { href: "/blog/write/ai-form", icon: PenSquare, label: "AI 글쓰기" },
  { href: "/blog", icon: FileText, label: "게시글 관리" },
  { href: "/api-settings", icon: KeyRound, label: "API 키 설정" },
];

export default function BlogSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white md:w-60 md:flex-shrink-0 md:justify-between md:self-stretch md:border-b-0 md:border-r">
      <div>
        <div className="px-5 pt-4">
          <div className="text-lg font-semibold text-slate-900">BLOG(원문)생성 자동화</div>
          <Link
            href="/programs"
            className="mb-4 block text-xs text-slate-400 hover:text-slate-700 md:mb-6"
          >
            ← 다른 프로그램 보기
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-3">
        <p className="mb-2 truncate px-2 text-xs text-slate-400">{userEmail}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
