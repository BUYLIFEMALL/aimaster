// AIMaster 2026-11-13(주인님 「권장안대로」, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-2):
// 자동화 「알림 보내기」의 「내 메일·카카오톡으로도 받기」. 받는 사람은 자동화를 만든 회원 본인뿐.
// 새 연결 화면을 만들지 않고 공용 연동을 다시 쓴다(최상위 규칙: 회원 본인 계정·키만, 운영자 계정 폴백 없음).
//  · 메일 = 공용 표 user_smtp_accounts(회원이 「예약(취소)방지 리마인드 자동화」 등에서 등록한 본인 메일 계정) → 받는 주소는 회원 본인 로그인 메일
//  · 카카오 = 공용 표 member_platform_accounts platform kakao(「나에게 보내기」 talk_message 권한) + 회원 본인 카카오 REST 키로 토큰 갱신
//    (기준: realty-listing-alert / commercial-land-trade-alert lib/notifyChannels.ts·notifySend.ts)
//  · 한도: 채널별 회원당 하루 100건(이식판 DB에 한국 날짜로 셈), 같은 내용은 1분 안에 다시 보내지 않음
//  · 실패하면 자동화는 그대로 두고, 회원에게 앱 알림으로 이유를 알린다(채널별 한 시간에 한 번)
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMemberAccount, markMemberAccountNeedsReconnect, updateMemberAccountToken } from '@/lib/memberIntegrations';
import { db, getRecord, putRecord } from '@/litpage/server/db.ts';
import { ApiError, type Ctx } from '@/litpage/server/api/handlers.ts';
import { setReminderExternalHandler } from '@/litpage/server/reminders.ts';
import { deliver, esc } from '@/litpage/server/mail.ts';
import { pushNotification } from '@/litpage/server/notify.ts';
import { setExternalNotifyHandler, type ExternalNotifyInput } from '@/litpage/server/automations/engine.ts';
import type { BlockRecord, NotificationRecord, SpaceRecord, UserRecord, UserSettingsRecord } from '#shared/records.ts';
import { newId, pageSlug } from '#shared/ids.ts';
import { toPlainText } from '#shared/richtext.ts';

export const EXTERNAL_PER_DAY = 100;
const DUP_MS = 60_000;
const FAIL_NOTICE_MS = 3_600_000;
const SITE = 'https://ai-work-workspace.buylife.xyz';
type Channel = 'email' | 'kakao';

const admin = () => createAdminClient() as unknown as SupabaseClient;

// ---------------------------------------------------------------- 한도·중복(시험에서 직접 부름)
let ready = false;
function ensureTable() {
  if (ready) return;
  db.exec('CREATE TABLE IF NOT EXISTS aww_external_notify_usage (user_id TEXT NOT NULL, day TEXT NOT NULL, channel TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (user_id, day, channel))');
  ready = true;
}
const kstDay = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
const recent = new Map<string, number>();
const failNoticeAt = new Map<string, number>();

/** 보낼 수 있으면 null(그리고 하루 횟수 +1), 아니면 이유 */
export function externalGate(userId: string, channel: Channel, text: string, now = Date.now()): string | null {
  const dupKey = `${userId}:${channel}:${createHash('sha256').update(text).digest('hex')}`;
  const last = recent.get(dupKey);
  if (last !== undefined && now - last < DUP_MS) return '같은 내용은 1분 안에 다시 보내지 않습니다.';
  ensureTable();
  const day = kstDay(now);
  const row = db.prepare('SELECT count FROM aww_external_notify_usage WHERE user_id = ? AND day = ? AND channel = ?').get(userId, day, channel) as { count: number } | undefined;
  if ((row?.count ?? 0) >= EXTERNAL_PER_DAY) return `${channel === 'email' ? '메일' : '카카오톡'} 알림은 하루 ${EXTERNAL_PER_DAY}건까지 보낼 수 있습니다. 내일 다시 동작합니다.`;
  db.prepare('INSERT INTO aww_external_notify_usage (user_id, day, channel, count) VALUES (?, ?, ?, 1) ON CONFLICT (user_id, day, channel) DO UPDATE SET count = aww_external_notify_usage.count + 1').run(userId, day, channel);
  recent.set(dupKey, now);
  if (recent.size > 5000) for (const [k, t] of recent) if (now - t >= DUP_MS) recent.delete(k);
  return null;
}

// ---------------------------------------------------------------- 메일(회원 본인 메일 계정)
async function sendEmail(n: ExternalNotifyInput, link: string): Promise<string | null> {
  const to = getRecord<UserRecord>('lit_user', n.userId)?.email;
  if (!to) return '받을 내 메일 주소를 확인하지 못했습니다.';
  const { data } = await admin().from('user_smtp_accounts')
    .select('smtp_host, smtp_port, smtp_user, smtp_password, from_name, is_active')
    .eq('user_id', n.userId).order('created_at', { ascending: true });
  const acc = (data ?? []).find((r: { is_active?: boolean | null }) => r.is_active !== false) as
    | { smtp_host: string; smtp_port: number; smtp_user: string; smtp_password: string; from_name: string | null } | undefined;
  if (!acc) return '보낼 메일 계정(SMTP)이 없습니다. 「예약(취소)방지 리마인드 자동화」 등 메일 발송 프로그램의 설정에서 본인 메일 계정을 한 번 등록해 주세요.';
  const port = Number(acc.smtp_port) || 465;
  const subject = `[업무 워크스페이스] ${n.automationName}`;
  try {
    await deliver(
      { host: acc.smtp_host, port, secure: port === 465, user: acc.smtp_user, pass: acc.smtp_password, from: acc.from_name ? `${acc.from_name} <${acc.smtp_user}>` : acc.smtp_user, insecure: false },
      { id: newId(), to, subject, text: `${n.text}\n\n열기: ${link}`, html: `<p style="white-space:pre-wrap">${esc(n.text)}</p><p><a href="${esc(link)}">업무 워크스페이스에서 열기</a></p>` },
    );
    return null;
  } catch {
    return '메일을 보내지 못했습니다. 등록한 메일 계정의 앱 비밀번호와 SMTP 사용 설정을 확인해 주세요.';
  }
}

// ---------------------------------------------------------------- 카카오(나에게 보내기)
async function memberKey(userId: string, provider: string): Promise<string | null> {
  const { data } = await admin().from('user_api_keys').select('api_key').eq('user_id', userId).eq('provider', provider).maybeSingle();
  const v = typeof data?.api_key === 'string' ? data.api_key.trim() : '';
  return v || null;
}

async function kakaoToken(userId: string): Promise<{ token: string } | { error: string }> {
  const shared = await getMemberAccount(admin(), userId, 'kakao', { needScopes: ['talk_message'] });
  if (shared.status === 'not_connected') return { error: '카카오가 아직 연결되지 않았습니다. 「부동산 실시간 매물 알림」 등 카카오 알림 프로그램에서 카카오를 한 번 연결해 주세요.' };
  if (shared.status === 'missing_scopes' || shared.account.needsReconnect || !shared.account.refreshToken) return { error: '카카오 연결을 다시 해 주세요(「나에게 보내기」 권한 필요).' };
  const account = shared.account;
  const restKey = await memberKey(userId, 'kakao_rest_api_key');
  if (!restKey) return { error: '카카오 앱 REST API 키가 없습니다. 카카오를 연결한 프로그램에서 키를 저장해 주세요.' };
  if (account.appRef !== restKey) return { error: '카카오 앱 키가 바뀌었습니다. 카카오를 다시 연결해 주세요.' };
  const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
  if (expiresAt - Date.now() > 5 * 60_000) return { token: account.accessToken };
  const form: Record<string, string> = { grant_type: 'refresh_token', client_id: restKey, refresh_token: account.refreshToken! };
  const secret = await memberKey(userId, 'kakao_client_secret');
  if (secret) form.client_secret = secret;
  const res = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(form).toString() });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!res.ok || !body.access_token) {
    await markMemberAccountNeedsReconnect(admin(), userId, account.id);
    return { error: '카카오 연결이 만료됐습니다. 카카오를 다시 연결해 주세요.' };
  }
  await updateMemberAccountToken(admin(), userId, account.id, {
    accessToken: body.access_token,
    tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 21599) * 1000).toISOString(),
    refreshToken: body.refresh_token ?? null,
  });
  return { token: body.access_token };
}

async function sendKakao(n: ExternalNotifyInput, link: string): Promise<string | null> {
  const t = await kakaoToken(n.userId);
  if ('error' in t) return t.error;
  const template = { object_type: 'text', text: `[${n.automationName}]\n${n.text}`.slice(0, 200), link: { web_url: link, mobile_web_url: link }, button_title: '열기' };
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }).toString(),
  });
  return res.ok ? null : `카카오톡으로 보내지 못했습니다(${res.status}).`;
}

// ---------------------------------------------------------------- 연결
function failNotice(n: ExternalNotifyInput, channel: Channel, reason: string) {
  const key = `${n.userId}:${channel}`;
  const at = failNoticeAt.get(key) ?? 0;
  if (Date.now() - at < FAIL_NOTICE_MS) return;
  failNoticeAt.set(key, Date.now());
  pushNotification({
    user_id: n.userId, space_id: n.spaceId, type: 'automation' as NotificationRecord['type'], navigable_block_id: n.pageId,
    activity: { kind: 'message', automation_name: n.automationName, message: `${channel === 'email' ? '메일' : '카카오톡'} 알림을 보내지 못했습니다: ${reason}`, page_id: n.pageId },
  } as Parameters<typeof pushNotification>[0]);
}

export async function sendExternal(n: ExternalNotifyInput): Promise<void> {
  const page = getRecord<BlockRecord>('block', n.pageId);
  const domain = getRecord<SpaceRecord>('space', n.spaceId)?.domain ?? 'workspace';
  const link = `${SITE}/${domain}/${pageSlug(toPlainText(page?.properties?.title), n.pageId)}`;
  for (const channel of n.channels) {
    const gate = externalGate(n.userId, channel, n.text);
    if (gate) {
      if (!gate.startsWith('같은 내용')) failNotice(n, channel, gate);
      continue;
    }
    const err = await (channel === 'email' ? sendEmail(n, link) : sendKakao(n, link)).catch(() => '잠시 후 다시 시도해 주세요.');
    if (err) failNotice(n, channel, err);
  }
}

setExternalNotifyHandler(sendExternal);

// ---------------------------------------------------------------- 일정 리마인더(2026-11-13, 주인님 「진행하고」)
// 회원이 「API키등록·플랫폼연동 › 알림 받기」에서 켠 채널로만 보낸다(기본 꺼짐). 받는 사람 = 리마인더 대상 회원 본인.
// 저장: 회원 설정(user_settings.settings.aww_notify_external = "email,kakao"). 한도·중복 금지는 자동화 알림과 같은 표를 함께 쓴다.
export const NOTIFY_PREF_KEY = 'aww_notify_external';
const cleanChannels = (v: unknown): Channel[] => [...new Set((Array.isArray(v) ? v : String(v ?? '').split(',')).map((x) => String(x).trim()).filter((x): x is Channel => x === 'email' || x === 'kakao'))];

export function reminderChannels(userId: string): Channel[] {
  const settings = getRecord<UserSettingsRecord>('user_settings', userId);
  return cleanChannels((settings?.settings as Record<string, unknown> | undefined)?.[NOTIFY_PREF_KEY]);
}

export const notifyPrefHandlers: Record<string, (ctx: Ctx, body: any) => unknown> = {
  /** 리마인더를 내 메일·카카오톡으로도 받을지 — 읽기 */
  awwNotifyPrefs(ctx) {
    if (!ctx.userId) throw new ApiError('Unauthorized', 401);
    return { reminder: reminderChannels(ctx.userId) };
  },
  /** 저장({ reminder: ['email','kakao'] }) */
  awwSaveNotifyPrefs(ctx, body) {
    if (!ctx.userId) throw new ApiError('Unauthorized', 401);
    const settings = getRecord<UserSettingsRecord>('user_settings', ctx.userId);
    if (!settings) throw new ApiError('회원 설정을 찾지 못했습니다. 워크스페이스를 한 번 연 뒤 다시 시도해 주세요.', 400);
    const reminder = cleanChannels(body?.reminder);
    putRecord('user_settings', { ...settings, version: (settings.version ?? 0) + 1, settings: { ...settings.settings, [NOTIFY_PREF_KEY]: reminder.join(',') } } as UserSettingsRecord);
    return { reminder };
  },
};

setReminderExternalHandler(async (n) => {
  const channels = reminderChannels(n.userId);
  if (channels.length) await sendExternal({ userId: n.userId, channels, automationName: '일정 리마인더', text: n.text, pageId: n.pageId, spaceId: n.spaceId });
});
