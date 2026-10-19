"use client";

import { useState } from "react";
import { Activity, CheckCircle2, Mail, MessageSquare, XCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";

type CheckResult = { ok: boolean; message: string };
type Health = { checkedAt: string; email: CheckResult; sms: CheckResult };

/** 비밀번호 찾기·고객문의 등에 쓰는 메일(SMTP)·문자(솔라피) 연결 점검 — 실제 발송 없음 */
export default function MessagingHealthCheck() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/messaging-health", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "점검하지 못했습니다.");
      setHealth(data);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const Row = ({ icon, label, result }: { icon: React.ReactNode; label: string; result: CheckResult }) => (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${result.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
      <span className="mt-0.5 text-subtext">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className={`text-sm ${result.ok ? "text-emerald-300" : "text-red-300"}`}>{result.message}</p>
      </div>
      {result.ok ? <CheckCircle2 size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-red-400" />}
    </div>
  );

  return (
    <GlassCard className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">메일·문자 연결 점검</h2>
          <p className="text-sm text-subtext">비밀번호·이메일 찾기와 고객문의 메일에 쓰는 연결 상태를 확인합니다. 실제로 메일·문자를 보내지 않습니다.</p>
        </div>
        <GoldButton type="button" size="sm" onClick={run} disabled={loading}>
          <Activity size={16} /> {loading ? "점검 중..." : "연결 점검"}
        </GoldButton>
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {health && (
        <div className="mt-4 space-y-2">
          <Row icon={<Mail size={18} />} label="메일(SMTP)" result={health.email} />
          <Row icon={<MessageSquare size={18} />} label="문자(솔라피)" result={health.sms} />
          <p className="text-xs text-subtext">점검 시각 {new Date(health.checkedAt).toLocaleString("ko-KR")}</p>
        </div>
      )}
    </GlassCard>
  );
}
