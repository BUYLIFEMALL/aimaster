// 관리자: 저장공간 요금제(용량·생성/포스팅 보관 기간·금액·결제 주기·사용 여부) 저장 — 등급 혜택은 2026-11-11 없앰
// 주인님 2026-11-11 「관리자페이지에 수동으로 해당 금액,기간 등 설정할수 있도록 기능확장」
// 저장 결과: storage_plans(정책 값) + 「저장공간 추가」(storage-plus) 결제 요금제(pricing_plans) 동기화 + member_grades.storage_plan_slug
// 그 뒤 전 회원 열외(retention_exempt) 다시 계산. 바뀐 용량·기간은 기존 구독자에게도 바로 적용된다.
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BILLING = new Set(["monthly", "bimonthly", "quarterly", "biannual", "annual"]);

type PlanInput = {
  slug?: string | null;
  name: string;
  quota_mb: number;
  retention_days: number | null;
  unlimited: boolean;
  posted_retention_days: number | null;
  posted_unlimited: boolean;
  price: number;
  billing_type: string;
  is_active: boolean;
  sort_order: number;
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { user };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const plans: PlanInput[] = Array.isArray(body?.plans) ? body.plans : [];
  if (plans.length === 0) return NextResponse.json({ error: "요금제가 없습니다." }, { status: 400 });

  for (const p of plans) {
    const label = p.name?.trim() || "(이름 없음)";
    if (!p.name?.trim() || p.name.trim().length > 30) return NextResponse.json({ error: `요금제 이름을 1~30자로 입력해 주세요: ${label}` }, { status: 400 });
    if (!Number.isInteger(p.quota_mb) || p.quota_mb < 10 || p.quota_mb > 10_240_000) return NextResponse.json({ error: `용량은 10MB 이상 정수(MB): ${label}` }, { status: 400 });
    if (!p.unlimited && (!Number.isInteger(p.retention_days) || (p.retention_days as number) < 1 || (p.retention_days as number) > 3650))
      return NextResponse.json({ error: `생성 콘텐츠 보관 기간은 1~3650일: ${label}` }, { status: 400 });
    if (!p.posted_unlimited && (!Number.isInteger(p.posted_retention_days) || (p.posted_retention_days as number) < 1 || (p.posted_retention_days as number) > 3650))
      return NextResponse.json({ error: `포스팅 콘텐츠 보관 기간은 1~3650일: ${label}` }, { status: 400 });
    if (p.slug !== "free") {
      if (!Number.isInteger(p.price) || p.price < 100 || p.price > 10_000_000) return NextResponse.json({ error: `금액은 100원 이상 정수: ${label}` }, { status: 400 });
      if (!BILLING.has(p.billing_type)) return NextResponse.json({ error: `결제 주기를 골라 주세요: ${label}` }, { status: 400 });
    }
  }

  const service = createServiceClient();
  const { data: program } = await service.from("programs").select("id").eq("slug", "storage-plus").maybeSingle();
  if (!program) return NextResponse.json({ error: "「저장공간 추가」 결제 프로그램(storage-plus)이 없습니다." }, { status: 500 });

  for (const p of plans) {
    const isFree = p.slug === "free";
    const slug = p.slug && /^[a-z0-9_-]{2,40}$/.test(p.slug) ? p.slug : `plan_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const quota = p.quota_mb * 1024 * 1024;
    const { error } = await service.from("storage_plans").upsert(
      {
        slug,
        name: p.name.trim(),
        quota_bytes: quota,
        retention_days: p.unlimited ? null : p.retention_days,
        posted_retention_days: p.posted_unlimited ? null : p.posted_retention_days,
        price_monthly: isFree ? 0 : p.price,
        sort_order: Number.isInteger(p.sort_order) ? p.sort_order : 0,
        is_active: isFree ? true : !!p.is_active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
    if (error) return NextResponse.json({ error: `요금제 저장 실패(${p.name}): ${error.message}` }, { status: 500 });
    if (isFree) continue;

    const gbLabel = p.quota_mb >= 1024 ? `${Math.round((p.quota_mb / 1024) * 10) / 10}GB` : `${p.quota_mb}MB`;
    const pricing = {
      name: `${p.name.trim()} ${gbLabel}`,
      price: p.price,
      billing_type: p.billing_type,
      is_active: !!p.is_active,
      sort_order: Number.isInteger(p.sort_order) ? p.sort_order : 0,
    };
    const { data: existing } = await service
      .from("pricing_plans")
      .select("id")
      .eq("program_id", program.id)
      .eq("storage_plan_slug", slug)
      .limit(1)
      .maybeSingle();
    const res = existing
      ? await service.from("pricing_plans").update(pricing).eq("id", existing.id)
      : await service.from("pricing_plans").insert({ ...pricing, program_id: program.id, storage_plan_slug: slug });
    if (res.error) return NextResponse.json({ error: `결제 요금제 저장 실패(${p.name}): ${res.error.message}` }, { status: 500 });
  }

  const { data: changed } = await service.rpc("member_storage_refresh_exempt");
  return NextResponse.json({ ok: true, exemptChanged: changed ?? 0 });
}
