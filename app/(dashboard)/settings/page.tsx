"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, LogOut, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  // 프로필 상태
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // 비밀번호 상태
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setName(profile.name ?? "");
        setPhone(profile.phone ?? "");
      }
    })();
  }, [supabase, router]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfileMsg("프로필이 저장되었습니다");
      setTimeout(() => setProfileMsg(""), 3000);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg("");

    if (newPassword.length < 6) {
      setPwMsg("비밀번호는 6자 이상이어야 합니다");
      setPwLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg("비밀번호가 일치하지 않습니다");
      setPwLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg("비밀번호가 변경되었습니다");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "변경 실패");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>설정</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1">프로필 및 계정 설정을 관리하세요</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* 프로필 수정 */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <User size={18} className="text-gold" />
            </div>
            <h2 className="text-lg font-bold text-white">프로필 정보</h2>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm text-subtext mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                disabled
                className="input-dark w-full opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-subtext mt-1">이메일은 변경할 수 없습니다</p>
            </div>

            <div>
              <label className="block text-sm text-subtext mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark w-full"
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm text-subtext mb-1.5">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-dark w-full"
                placeholder="010-0000-0000"
              />
            </div>

            {profileMsg && (
              <p className={`text-sm flex items-center gap-1 ${
                profileMsg.includes("저장") ? "text-emerald-400" : "text-red-400"
              }`}>
                {profileMsg.includes("저장") && <Check size={14} />}
                {profileMsg}
              </p>
            )}

            <GoldButton type="submit" size="sm" disabled={profileLoading}>
              {profileLoading ? "저장 중..." : "프로필 저장"}
            </GoldButton>
          </form>
        </GlassCard>

        {/* 비밀번호 변경 */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Lock size={18} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">비밀번호 변경</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm text-subtext mb-1.5">새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-dark w-full"
                placeholder="6자 이상 입력"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-subtext mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-dark w-full"
                placeholder="비밀번호를 다시 입력"
                required
              />
            </div>

            {pwMsg && (
              <p className={`text-sm flex items-center gap-1 ${
                pwMsg.includes("변경되었") ? "text-emerald-400" : "text-red-400"
              }`}>
                {pwMsg.includes("변경되었") && <Check size={14} />}
                {pwMsg}
              </p>
            )}

            <GoldButton type="submit" size="sm" disabled={pwLoading}>
              {pwLoading ? "변경 중..." : "비밀번호 변경"}
            </GoldButton>
          </form>
        </GlassCard>

        {/* 로그아웃 */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold">로그아웃</h2>
              <p className="text-subtext text-sm mt-1">현재 세션에서 로그아웃합니다</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
