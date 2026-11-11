import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import StoragePlansEditor, { type EditablePlan } from "@/components/admin/StoragePlansEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "저장공간 요금제" };

// 관리자: 저장공간 요금제(용량·보관 기간·금액·결제 주기)와 등급별 기본 혜택 — docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md
export default async function AdminStoragePlansPage() {
  const supabase = createServiceClient();
  const { data: program } = await supabase.from("programs").select("id").eq("slug", "storage-plus").maybeSingle();
  const [{ data: plans }, { data: pricing }, { data: subs }] = await Promise.all([
    supabase.from("storage_plans").select("*").order("sort_order"),
    program
      ? supabase.from("pricing_plans").select("id, price, billing_type, is_active, storage_plan_slug").eq("program_id", program.id)
      : Promise.resolve({ data: [] as { id: string; price: number; billing_type: string; is_active: boolean; storage_plan_slug: string | null }[] }),
    program
      ? supabase.from("subscriptions").select("pricing_plan_id").eq("program_id", program.id).eq("status", "active")
      : Promise.resolve({ data: [] as { pricing_plan_id: string }[] }),
  ]);

  const subCount = new Map<string, number>();
  for (const s of subs ?? []) subCount.set(s.pricing_plan_id, (subCount.get(s.pricing_plan_id) ?? 0) + 1);

  const editable: EditablePlan[] = (plans ?? []).map((p: { slug: string; name: string; quota_bytes: number; retention_days: number | null; posted_retention_days: number | null; price_monthly: number; is_active: boolean; sort_order: number }) => {
    const pp = (pricing ?? []).find((x) => x.storage_plan_slug === p.slug);
    return {
      slug: p.slug,
      name: p.name,
      quota_mb: Math.round(Number(p.quota_bytes) / 1024 ** 2),
      retention_days: p.retention_days,
      unlimited: p.retention_days === null,
      posted_retention_days: p.posted_retention_days,
      posted_unlimited: p.posted_retention_days === null,
      price: pp?.price ?? p.price_monthly,
      billing_type: pp?.billing_type ?? "monthly",
      is_active: p.slug === "free" ? true : pp ? pp.is_active && p.is_active : p.is_active,
      sort_order: p.sort_order,
      subscribers: pp ? subCount.get(pp.id) ?? 0 : 0,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>저장공간</GoldGradientText> 요금제
        </h1>
        <p className="text-subtext mt-1 text-sm break-keep">
          회원 저장 용량, 생성 콘텐츠 보관 기간, 포스팅 콘텐츠 보관 기간, 금액, 결제 주기를 여기서 정합니다. 상황에 따라 언제든 바꿀 수 있습니다. 「기본」은 모든 일반 회원에게 적용되는 무료 기준입니다. 저장하면 결제 화면(/storage)과
          기존 구독자에게도 바로 적용되며, 회원별 예외는 「회원 관리」의 💾에서 지정합니다.
        </p>
      </div>
      {program ? (
        <StoragePlansEditor initialPlans={editable} />
      ) : (
        <p className="text-red-400 text-sm">「저장공간 추가」 결제 프로그램(storage-plus)이 없습니다 — 마이그레이션 0063을 확인해 주세요.</p>
      )}
    </div>
  );
}
