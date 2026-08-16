"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Home, Search, PenSquare, FileText, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/blog/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/blog", icon: Home, label: "홈 (전체 글)" },
  { href: "/blog/candidates", icon: Search, label: "게시글 주제 수집" },
  { href: "/blog/write/ai-form", icon: PenSquare, label: "AI 글쓰기" },
  { href: "/blog/my-posts", icon: FileText, label: "내 글" },
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
    <aside className="flex w-full flex-col border-b border-white/10 md:h-full md:w-60 md:flex-shrink-0 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="px-5 pt-4">
          <div className="text-lg font-semibold text-white">AI 자동 블로그</div>
          <Link
            href="/programs"
            className="mb-4 block text-xs text-white/40 hover:text-white/70 md:mb-6"
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
                  ? "bg-gold/10 text-gold"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10 p-3">
        <p className="mb-2 truncate px-2 text-xs text-white/40">{userEmail}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
