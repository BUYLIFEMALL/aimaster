import Link from "next/link";
import { redirect } from "next/navigation";
import { HardDrive, FolderOpen } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import StoragePlanCards from "@/components/storage/StoragePlanCards";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getStorageSummary,
  listStoragePlanOffers,
  formatBytes,
  formatRetention,
  SOURCE_LABEL,
} from "@/lib/storage/memberStorage";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "저장공간", robots: { index: false, follow: false } };

// 「💾 저장공간」(2026-11-11, docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md) — 내 사용량·보관 기간과 저장 구독.
export default async function StoragePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/storage");

  const service = createServiceClient();
  const [summary, offers] = await Promise.all([getStorageSummary(service, user.id), listStoragePlanOffers(service)]);
  const ratio = summary.ratio ?? 0;
  const barColor = ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-gold" /> 저장공간
        </h1>
        <p className="text-subtext text-sm mt-1 break-keep">
          모든 프로그램에서 만든 이미지·영상·음악·파일이 이 공간을 함께 씁니다. 기본은 <b className="text-white">1GB · 30일 보관</b>이고,
          블로그·SNS에 올린 자료도 보관 기간이 지나면 자동으로 지워집니다. 더 오래, 더 많이 보관하려면 저장 구독을 이용해 주세요.
        </p>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-subtext text-xs">사용 중</p>
            <p className="text-3xl font-extrabold text-white">
              {formatBytes(summary.usedBytes)}
              <span className="text-base font-medium text-subtext"> / {formatBytes(summary.quotaBytes)}</span>
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-white font-bold">{formatRetention(summary)}</p>
            <p className="text-subtext text-xs">
              {SOURCE_LABEL[summary.source]} · {summary.planName ?? "기본"}
              {summary.planExpiresAt && ` · ${formatDate(summary.planExpiresAt)}까지`}
              {summary.overrideUntil && ` · 관리자 지정 ${formatDate(summary.overrideUntil)}까지`}
            </p>
          </div>
        </div>
        {summary.ratio !== null && (
          <div className="mt-4 h-3 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </div>
        )}
        <p className="text-subtext text-xs mt-2">
          파일 {summary.fileCount.toLocaleString()}개 · 마지막 계산 {summary.measuredAt ? new Date(summary.measuredAt).toLocaleString("ko-KR") : "-"} (매일 새벽 자동 계산, 화면 왼쪽 아래 💾에서 「다시 계산」)
        </p>
        {summary.byBucket.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {summary.byBucket.map((b) => (
              <li key={b.bucket} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="text-white/90">{b.label}</span>
                <span className="text-subtext">{formatBytes(b.bytes)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/library" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline">
          <FolderOpen className="w-3.5 h-3.5" /> 내 자료함에서 자료 보기
        </Link>
      </GlassCard>

      {summary.source === "exempt" ? (
        <GlassCard className="p-5 text-sm text-subtext">관리자·시험 계정은 용량 제한과 자동 삭제가 없습니다.</GlassCard>
      ) : (
        <StoragePlanCards offers={offers} currentQuotaBytes={summary.quotaBytes} />
      )}
    </div>
  );
}
