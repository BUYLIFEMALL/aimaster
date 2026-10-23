import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { setTelegramWebhook } from "@/lib/telegram/client";
import { computeWebhookSecret } from "@/lib/telegram/webhookSecret";
import { SITE_ORIGIN } from "@/lib/oauthRedirect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const THIS_PROGRAM_SLUG = "youtube-auto-reply";

// 옛 *.vercel.app 주소 삭제 대비(2026-10-16 주인님 승인, docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md):
// 이미 연동된 회원 봇의 웹훅이 옛 주소를 가리키면 새 주소로 다시 등록한다. 같은 secret_token을 쓰므로
// 승인 버튼 검증은 그대로이고, 옛 주소도 삭제 전까지는 계속 받으므로 끊기는 구간이 없다.
// cron 라우트와 같은 CRON_SECRET Bearer 인증. 봇 토큰·채팅 ID는 응답에 넣지 않는다.
// 인증: CRON_SECRET Bearer 또는 관리자(profiles.is_admin) 로그인 — 관리자는 브라우저 주소창으로 열어 실행할 수 있다(GET).
async function isAllowed(request: NextRequest, admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  if (process.env.CRON_SECRET && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) return true;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  // profiles는 공용 테이블이라 이 앱 DB 타입에 없음(lib/access.ts와 같은 방식으로 느슨하게 조회)
  const { data: profile } = await (admin as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { is_admin?: boolean } | null }> } } } })
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return profile?.is_admin === true;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!(await isAllowed(request, admin))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: links, error } = await admin
    .from("user_telegram_links")
    .select("user_id, bot_token")
    .eq("program_slug", THIS_PROGRAM_SLUG);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = { total: links?.length ?? 0, alreadyNew: 0, moved: 0, failed: 0, failures: [] as string[] };
  for (const link of links ?? []) {
    const url = `${SITE_ORIGIN}/api/telegram/webhook/${link.user_id}`;
    try {
      const info = await fetch(`https://api.telegram.org/bot${link.bot_token}/getWebhookInfo`).then((r) => r.json());
      if (info?.result?.url === url) { result.alreadyNew++; continue; }
      await setTelegramWebhook({ botToken: link.bot_token, url, secretToken: computeWebhookSecret(link.user_id) });
      result.moved++;
    } catch (err) {
      result.failed++;
      result.failures.push(`${link.user_id.slice(0, 8)}: ${err instanceof Error ? err.message.slice(0, 120) : "실패"}`);
    }
  }
  return NextResponse.json(result);
}
