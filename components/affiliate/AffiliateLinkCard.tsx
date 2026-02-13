"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

interface AffiliateLinkCardProps {
  affiliateCode: string;
}

export default function AffiliateLinkCard({ affiliateCode }: AffiliateLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const affiliateUrl = `${baseUrl}/programs?ref=${affiliateCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(affiliateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white">내 추천 코드</span>
        <span className="gold-text font-bold text-lg tracking-widest">{affiliateCode}</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={affiliateUrl}
          className="input-dark flex-1 text-sm"
        />
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            copied
              ? "bg-emerald-500/20 text-emerald-400"
              : "btn-gold"
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "복사됨!" : "복사"}
        </button>
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-subtext hover:text-white hover:bg-white/10 transition-colors border border-white/10"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      <p className="text-subtext text-xs mt-3">
        이 링크를 통해 가입한 사용자가 결제하면 자동으로 수수료가 적립됩니다 (30일 쿠키)
      </p>
    </GlassCard>
  );
}
