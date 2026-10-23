"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import type { ConcurrentLoginPolicy } from "@/types/database.types";

interface SiteSettingsManagerProps {
  initialSettings: Record<string, unknown>;
}

export default function SiteSettingsManager({ initialSettings }: SiteSettingsManagerProps) {
  const rawPolicy = initialSettings.concurrent_login_policy;
  const parsedPolicy = typeof rawPolicy === "string"
    ? rawPolicy.replace(/"/g, "") as ConcurrentLoginPolicy
    : "force_logout";

  const [policy, setPolicy] = useState<ConcurrentLoginPolicy>(parsedPolicy);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePolicy = async (newPolicy: ConcurrentLoginPolicy) => {
    setPolicy(newPolicy);
    setSaving(true);
    setSaved(false);

    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "concurrent_login_policy", value: newPolicy }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <GlassCard>
        <h2 className="text-lg font-bold text-white mb-4">
          동시 접속 <GoldGradientText>제한 정책</GoldGradientText>
        </h2>
        <p className="text-subtext text-sm mb-6">
          한 계정으로 여러 기기에서 동시에 접속할 때의 처리 방식을 설정합니다.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => savePolicy("force_logout")}
            disabled={saving}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              policy === "force_logout"
                ? "border-gold/40 bg-gold/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                policy === "force_logout" ? "border-gold" : "border-white/30"
              }`}>
                {policy === "force_logout" && <div className="w-2 h-2 rounded-full bg-gold" />}
              </div>
              <div>
                <p className="text-white font-medium text-sm">기존 세션 강제 종료</p>
                <p className="text-subtext text-xs mt-0.5">
                  새 기기에서 로그인하면 기존 기기는 자동으로 로그아웃됩니다
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => savePolicy("block_new")}
            disabled={saving}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              policy === "block_new"
                ? "border-gold/40 bg-gold/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                policy === "block_new" ? "border-gold" : "border-white/30"
              }`}>
                {policy === "block_new" && <div className="w-2 h-2 rounded-full bg-gold" />}
              </div>
              <div>
                <p className="text-white font-medium text-sm">새 접속 차단</p>
                <p className="text-subtext text-xs mt-0.5">
                  이미 접속 중인 기기가 있으면 새 기기에서 로그인이 거부됩니다
                </p>
              </div>
            </div>
          </button>
        </div>

        {saved && (
          <p className="text-green-400 text-sm mt-4">설정이 저장되었습니다.</p>
        )}
      </GlassCard>
    </div>
  );
}
