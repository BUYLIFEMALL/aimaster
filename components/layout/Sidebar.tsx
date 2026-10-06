"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Settings, KeyRound, Menu, X, LogOut } from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "내 구독" },
  { href: "/affiliate", icon: Users, label: "어필리에이트" },
  { href: "/api-settings", icon: KeyRound, label: "API 설정" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAccountEmail(user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setAccountEmail(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/session/logout", { credentials: "include" });
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/";
    } finally {
      setLoggingOut(false);
    }
  };

  const navContent = (
    <>
      <div className="p-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </Link>
      </div>
      <nav className="p-3 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1",
              pathname === href
                ? "text-gold bg-gold/10"
                : "text-subtext hover:text-white hover:bg-white/5"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      {/* 좌하단 푸터: 로그아웃 버튼 + 사용자 이메일 정보 */}
      <div className="p-3 border-t border-white/10 space-y-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-rose-500/15 text-subtext hover:text-rose-300 border border-white/5 hover:border-rose-500/30 transition-all font-medium text-xs cursor-pointer disabled:opacity-50"
          title="로그아웃"
        >
          <LogOut size={13} className={loggingOut ? "animate-spin" : ""} />
          <span>{loggingOut ? "로그아웃 중..." : "로그아웃"}</span>
        </button>

        {accountEmail && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/[0.02]">
            <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
              <span className="text-gold text-xs font-bold">{accountEmail[0].toUpperCase()}</span>
            </div>
            <p className="text-xs text-subtext truncate" title={accountEmail}>{accountEmail}</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* 모바일 햄버거 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </Link>
        <button onClick={() => setOpen(!open)} className="text-subtext hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* 모바일 오버레이 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* 모바일 슬라이드 사이드바 */}
      <aside
        className={cn(
          "fixed md:static z-30 top-0 left-0 h-full w-60 bg-surface border-r border-white/10 flex-shrink-0 transition-transform duration-200",
          "flex flex-col",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
