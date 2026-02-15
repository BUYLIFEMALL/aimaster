"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";
import type { Profile } from "@/types/database.types";

const NAV_LINKS = [
  { href: "/programs", label: "프로그램" },
  { href: "/packages", label: "패키지" },
  { href: "/revenue-share", label: "수익 공유" },
  { href: "/custom", label: "커스텀" },
  { href: "/support", label: "고객지원" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*, grade:member_grades(*)")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    getProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-surface/90 backdrop-blur-md border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
              <span className="text-black font-bold text-sm">AI</span>
            </div>
            <GoldGradientText className="text-xl font-bold">
              AI Master
            </GoldGradientText>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-gold bg-gold/10"
                    : "text-subtext hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Auth */}
          <div className="hidden md:flex items-center gap-3">
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                    <span className="text-black font-bold text-xs">
                      {profile.name?.[0] ?? profile.email[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white">{profile.name ?? profile.email.split("@")[0]}</span>
                  <ChevronDown size={14} className="text-subtext" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl py-1 shadow-xl">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-subtext hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <LayoutDashboard size={15} />
                      대시보드
                    </Link>
                    <Link
                      href="/affiliate"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-subtext hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User size={15} />
                      어필리에이트
                    </Link>
                    {profile.is_admin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gold hover:bg-gold/10 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings size={15} />
                        관리자 패널
                      </Link>
                    )}
                    <hr className="my-1 border-white/10" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-subtext hover:text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut size={15} />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <GoldButton variant="ghost" size="sm">로그인</GoldButton>
                </Link>
                <Link href="/register">
                  <GoldButton size="sm">무료 시작</GoldButton>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: Hamburger */}
          <button
            className="md:hidden p-2 text-subtext hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-md border-b border-white/10">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-gold bg-gold/10"
                    : "text-subtext hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              {profile ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <GoldButton variant="outline" fullWidth>대시보드</GoldButton>
                  </Link>
                  <GoldButton variant="ghost" fullWidth onClick={handleLogout}>
                    로그아웃
                  </GoldButton>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                    <GoldButton variant="outline" fullWidth>로그인</GoldButton>
                  </Link>
                  <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                    <GoldButton fullWidth>무료 시작</GoldButton>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
