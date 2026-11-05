import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PARTNER_NOTICE_VERSION } from "@/lib/partners/notice";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 제휴 타깃 찾기 확장 전용(v1.10 초안). 확장이 회원 로그인 쿠키로 부른다(회원 본인 것만).
// 서버는 네이버에 접속하지 않는다 — 확장이 회원 PC에서 공개 페이지를 읽어 결과만 보낸다(지침 §3-1).
// 스캔 결과 칸은 회원 RLS로 못 쓰게 막아 두었으니 서비스 키로, 반드시 user_id 조건과 함께 쓴다.

const DAILY_CAP = 300;
const BATCH = 10;
const reply = (v: unknown, status = 200) => Response.json(v, { status, headers: { "cache-control": "private, no-store" } });

const PHONE = /^[0-9+()\-\s]{7,40}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const list = (v: unknown, ok: RegExp, max = 5) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter((x) => x && x.length <= 200 && ok.test(x)).slice(0, max) : [];

function todayStartKst(): string {
  const now = new Date(Date.now() + 9 * 3600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 9 * 3600_000).toISOString();
}

export async function POST(req: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return reply({ error: access.error }, access.status);
  const userId = access.user.id;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "요청 형식을 확인해 주세요." }, 400); }
  const op = String(body.op ?? "");
  const db = createAdminClient();

  const { data: consent } = await db.from("competitor_partner_consents").select("notice_version, collect_email").eq("user_id", userId).maybeSingle();
  if (!consent || consent.notice_version < PARTNER_NOTICE_VERSION) return reply({ error: "프로그램 화면에서 이용 안내에 먼저 동의해 주세요." }, 403);

  if (op === "next_batch") {
    const { count } = await db.from("competitor_partner_channels").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("scanned_at", todayStartKst());
    const remaining = Math.max(0, DAILY_CAP - (count ?? 0));
    if (remaining === 0) return reply({ items: [], remaining, reason: "daily_cap" });
    const { data: rows } = await db.from("competitor_partner_channels")
      .select("id, url, channel_type, keyword, name")
      .eq("user_id", userId).eq("scan_status", "pending").neq("url", "")
      .order("match_score", { ascending: false }).limit(Math.min(BATCH, remaining));
    const items = rows ?? [];
    if (items.length) await db.from("competitor_partner_channels").update({ scan_status: "scanning" }).eq("user_id", userId).in("id", items.map((r) => r.id));
    return reply({ items, remaining, collectEmail: consent.collect_email });
  }

  if (op === "scan_report") {
    const id = String(body.id ?? "");
    if (!id) return reply({ error: "대상을 확인해 주세요." }, 400);
    const mobile = list(body.mobile, PHONE), landline = list(body.landline, PHONE), emails = consent.collect_email ? list(body.emails, EMAIL) : [];
    const primary = mobile[0] ? ["mobile", mobile[0]] : landline[0] ? ["landline", landline[0]] : emails[0] ? ["email", emails[0]] : null;
    const status = body.status === "stopped" ? "pending" : primary ? "done" : "none"; // 중지면 다음에 다시 스캔
    const { error } = await db.from("competitor_partner_channels").update({
      display_name: typeof body.display_name === "string" ? body.display_name.trim().slice(0, 100) || null : null,
      public_id: typeof body.public_id === "string" ? body.public_id.trim().slice(0, 100) || null : null,
      phones_mobile: mobile, phones_landline: landline, emails,
      primary_type: (primary?.[0] as "mobile" | "landline" | "email" | undefined) ?? null, primary_contact: primary?.[1] ?? null,
      profile_match_score: Math.min(60, Math.max(0, Math.round(Number(body.profile_match_score) || 0))),
      scan_status: status, scanned_at: status === "pending" ? null : new Date().toISOString(),
    }).eq("id", id).eq("user_id", userId);
    if (error) return reply({ error: "결과를 저장하지 못했습니다." }, 500);
    return reply({ ok: true, status });
  }

  if (op === "scan_stop") {
    await db.from("competitor_partner_channels").update({ scan_status: "pending" }).eq("user_id", userId).eq("scan_status", "scanning");
    return reply({ ok: true });
  }

  return reply({ error: "지원하지 않는 요청입니다." }, 400);
}
