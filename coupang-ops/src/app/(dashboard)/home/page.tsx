import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { getCoupangDefaults, getKeyExpiry, getWingKeys } from "@/lib/data";
import { TodayBoard } from "@/components/TodayBoard";
import { RejectedBoard, type RejectedJob } from "@/components/RejectedBoard";
import { createAdminClient } from "@/lib/supabase/admin";
import { keyExpiryNotice } from "@/lib/coupang/prefs";
import { monthlyCalls, recentWingWarnings } from "@/lib/coupang/usage";
import { FIXIE_FREE_MONTHLY } from "@/lib/coupang/usageRule";
import { Zap, ArrowRight, ShieldCheck, KeyRound, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();
  const [keys, defaults] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id)]);
  const calls = await monthlyCalls(user.id).catch(() => null);
  const apiWarnings = await recentWingWarnings(user.id).catch(() => []);
  const keyNotice = keys ? keyExpiryNotice(await getKeyExpiry(user.id).catch(() => ""), Date.now()) : null;
  const { data: rejected } = await createAdminClient()
    .from("coupang_ops_jobs")
    .select("id,product_id,product_name,seller_product_id,message")
    .eq("user_id", user.id)
    .eq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📊"
        title="AI 쿠팡 아이템위너 인텔리전스 랩"
        description="쿠팡 공식 WING Open API 기반 상품 대량 등록·10원 최저가 위너 방어·주문/송장 자동화를 안전하게 통합 관제합니다."
      >
        <Link href="/products" className="btn-3d-indigo text-xs py-1.5 px-3.5">
          <Zap size={13} />
          <span>상품 대량등록 시작</span>
        </Link>
      </PageHeader>

      {keyNotice && (
        <Notice tone="warn">
          🔑 <b>{keyNotice.text}</b>{" "}
          <Link href="/connect" className="font-bold text-indigo-700 underline ml-1 hover:text-indigo-900">
            키 다시 등록하기 →
          </Link>
        </Notice>
      )}

      {!keys && (
        <Notice tone="tip">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-bold text-emerald-950 mb-1">🧭 3분 빠른 시작 가이드</p>
              <p className="text-emerald-900 text-xs leading-relaxed">
                1. 쿠팡 WING Open API 키 발급(연동방식 「자체개발」) → 2. 프로그램에 Access/Secret Key 등록 → 3. 연결 시험 후 10원 최저가 위너 매칭 시작!
              </p>
            </div>
            <Link
              href="/guide"
              className="btn-3d-emerald text-xs py-1.5 px-3 shrink-0 inline-flex items-center gap-1.5"
            >
              <span>연동 매뉴얼 열기</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </Notice>
      )}

      {/* 실시간 4대 KPI & 오늘 할 일 통합 관제 데크 */}
      <TodayBoard keysSaved={!!keys} defaultCourier={defaults?.deliveryCompanyCode ?? ""} />

      {/* WING API 호출 현황 및 알림 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-indigo-600" />
          <span>Fixie 고정 IP 프록시를 통해 쿠팡 WING 서버와 100% 안전하게 통신합니다.</span>
        </div>
        {calls !== null && (
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
            이번 달 내 호출: {calls} / {FIXIE_FREE_MONTHLY}회
          </span>
        )}
      </div>

      {apiWarnings.length > 0 && (
        <Notice tone="warn">
          ⚠ <b>쿠팡 WING 발송 경고 내역 (최근 7일)</b>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px]">
            {apiWarnings.map((w) => (
              <li key={`${w.api}|${w.warning}`}>
                {w.warning} <span className="font-mono text-slate-500">({w.api})</span>
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <RejectedBoard jobs={(rejected ?? []) as RejectedJob[]} keysSaved={!!keys} />
    </div>
  );
}
