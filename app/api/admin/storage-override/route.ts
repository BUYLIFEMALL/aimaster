// 관리자: 회원별 저장 용량·보관 기간 수동 지정 (주인님 2026-11-11 「관리자페이지에서 수동으로 사용자별로 용량과 보관기간을 늘릴수 있도록」)
// 값을 비우면 자동(저장 구독·등급·기본)으로 돌아간다. 저장 뒤 열외 다시 계산 + 사용량 다시 측정.
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  const userIds: string[] = Array.isArray(body?.user_ids) ? body.user_ids : body?.user_id ? [body.user_id] : [];
  if (userIds.length === 0) return NextResponse.json({ error: "회원을 선택해 주세요." }, { status: 400 });

  const quotaGb = body.quota_gb === null || body.quota_gb === "" || body.quota_gb === undefined ? null : Number(body.quota_gb);
  const days = body.retention_days === null || body.retention_days === "" || body.retention_days === undefined ? null : Number(body.retention_days);
  const unlimited = body.unlimited_retention === true;
  if (quotaGb !== null && (!Number.isFinite(quotaGb) || quotaGb <= 0 || quotaGb > 10000))
    return NextResponse.json({ error: "용량은 0보다 크고 10,000GB 이하로 입력해 주세요." }, { status: 400 });
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650))
    return NextResponse.json({ error: "보관 기간은 1~3650일로 입력해 주세요." }, { status: 400 });
  const until = body.until ? new Date(body.until) : null;
  if (until && Number.isNaN(until.getTime())) return NextResponse.json({ error: "기한 날짜가 올바르지 않습니다." }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({
      storage_quota_override_bytes: quotaGb === null ? null : Math.round(quotaGb * 1024 ** 3),
      storage_retention_override_days: unlimited ? null : days,
      storage_retention_override_unlimited: unlimited,
      storage_override_until: until ? until.toISOString() : null,
      storage_override_note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null,
    })
    .in("id", userIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const uid of userIds) {
    await service.rpc("member_storage_refresh_exempt", { uid });
  }
  if (userIds.length <= 20) for (const uid of userIds) await service.rpc("member_storage_measure", { uid });

  const { data } = await service.rpc("member_storage_overview");
  const rows = ((data ?? []) as { user_id: string }[]).filter((r) => userIds.includes(r.user_id));
  return NextResponse.json({ ok: true, rows });
}
