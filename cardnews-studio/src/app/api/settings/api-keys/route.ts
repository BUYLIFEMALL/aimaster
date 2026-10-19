import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getRegisteredApiKeys, type SettingsKeyProvider, ALL_PROVIDERS } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CRONJOB_PROVIDER, ensureMemberSchedulerRunning, memberSchedulerMode, removeMemberScheduler } from "@/lib/instagram/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const keys = await getRegisteredApiKeys(access.user.id);
    return NextResponse.json({ keys });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { provider, apiKey } = await request.json();

    if (!ALL_PROVIDERS.includes(provider as SettingsKeyProvider)) {
      return NextResponse.json({ error: "지원하지 않는 API 프로바이더입니다." }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
    }

    const trimmedKey = apiKey.trim();

    // user_id를 로그인한 회원 본인으로 고정해서 저장한다(서비스 키 사용 시 소유자 한정).
    const adminClient = createAdminClient();
    // cron-job.org 키를 바꾸면 예전 계정의 회원 작업을 지운다(방식·일시정지 유지, v1.24)
    const service = adminClient as unknown as SupabaseClient;
    if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(service, access.user.id, { keepMode: true });
    const { error } = await adminClient.from("user_api_keys").upsert(
      {
        user_id: access.user.id,
        provider,
        api_key: trimmedKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // 「내 cron-job.org」 회원이고 남은 예약이 있으면 새 키 계정에 작업을 다시 켠다(v1.24)
    if (provider === CRONJOB_PROVIDER && (await memberSchedulerMode(service, access.user.id)) === "cronjob") {
      const { count } = await adminClient.from("cns_insta_posts").select("id", { count: "exact", head: true }).eq("user_id", access.user.id).eq("status", "scheduled");
      if ((count ?? 0) > 0) {
        try {
          await ensureMemberSchedulerRunning(service, access.user.id, trimmedKey);
        } catch (err) {
          return NextResponse.json({ success: true, message: `키는 저장했지만 예약 실행 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim() });
        }
      }
    }

    return NextResponse.json({ success: true, message: "API 키가 성공적으로 등록되었습니다." });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const provider = new URL(request.url).searchParams.get("provider");
    if (!provider || !ALL_PROVIDERS.includes(provider as SettingsKeyProvider)) {
      return NextResponse.json({ error: "삭제할 프로바이더를 지정해주세요." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    // cron-job.org 키를 지우면 회원 작업·연결 정보도 지우고 방식을 기본(Vercel)으로 되돌린다(v1.24). 키를 지우기 전에 해야 작업을 찾을 수 있다.
    if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(adminClient as unknown as SupabaseClient, access.user.id);
    const { error } = await adminClient
      .from("user_api_keys")
      .delete()
      .eq("user_id", access.user.id)
      .eq("provider", provider);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "API 키가 삭제되었습니다." });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
