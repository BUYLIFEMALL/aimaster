import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { TOOLS } from "@/lib/tools";
import { getCoupangDefaults, getWingKeys } from "@/lib/data";
import { TodayBoard } from "@/components/TodayBoard";
import { RejectedBoard, type RejectedJob } from "@/components/RejectedBoard";
import { createAdminClient } from "@/lib/supabase/admin";
import { usageCounts } from "@/lib/coupang/usage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();
  const [keys, defaults] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id)]);
  const usage = await usageCounts(user.id).catch(() => null);
  const { data: profile } = await createAdminClient().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  const { data: rejected } = await createAdminClient().from("coupang_ops_jobs").select("id,product_id,product_name,seller_product_id,message").eq("user_id", user.id).eq("status", "rejected").order("created_at", { ascending: false }).limit(10);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📦" title="AI 쿠팡 운영 자동화" description="쿠팡 공식 WING Open API로 상품 등록부터 주문·송장·문의까지 내 쿠팡 판매를 처리합니다." />

      <Notice tone="tip">
        🧭 <b>시작 순서</b>: 1. WING에서 Open API 키 발급(연동 방식 「자체개발」, 허용 IP 등록) → 2. 이 프로그램에 키 등록 → 3. 연결 시험 → 4. 상품 등록.
        키 발급 방법은 <Link href="/guide" className="font-bold text-blue-700 underline">📖 연동 &amp; 사용 매뉴얼</Link>에 있습니다.
      </Notice>

      <TodayBoard keysSaved={!!keys} defaultCourier={defaults?.deliveryCompanyCode ?? ""} />

      {usage && (
        <p className="px-1 text-[12px] text-slate-500">
          오늘 쿠팡 호출 {usage.today} / {usage.dailyLimit}회 · 상한에 닿으면 점검·목록 조회만 쉬고 주문·송장 처리는 계속됩니다.
          {profile?.is_admin ? ` 관리자: 이번 달 전체 ${usage.month} / ${usage.monthlyLimit}회(토스 연동 제외).` : ""}
        </p>
      )}

      <RejectedBoard jobs={(rejected ?? []) as RejectedJob[]} keysSaved={!!keys} />

      {TOOLS.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Link key={t.href} href={t.href} className="slw-card block p-4 transition hover:border-blue-300">
              <p className="text-[11px] font-black text-blue-700">STEP {i + 1}</p>
              <p className="mt-1 font-extrabold text-slate-900">{t.emoji} {t.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
