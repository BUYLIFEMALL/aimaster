import "server-only";
import { kstDay, molitItems, monthKey, parseTrades, type TradeKind, type TradeRow } from "./parse";
import { alertText, kakaoAlertText, matchesPrefs, normalizePrefs, kindLabel } from "./prefs";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { getKakaoState, getResendKey } from "@/lib/notifyChannels";
import { sendKakaoMemo, sendResendMail } from "@/lib/notifySend";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export const THIS_PROGRAM_SLUG = "commercial-land-trade-alert";

const SERVICE: Record<TradeKind, string> = { building: "NrgTrade", land: "LandTrade" };
const NUM_OF_ROWS = 1000;
const MAX_BACKFILL_MONTHS = 10; // 최근 2달 + 10달 = 12개월
const LAND_DAILY_GUARD = 900; // 토지 자료 하루 한도 1,000건에 여유를 둔다
const MAX_ALERTS_PER_RUN = 20;
const ALERT_RECENT_DAYS = 45;
const SUCCESS_NEXT_MS = 20 * 3600 * 1000;
const RETRY_NEXT_MS = 3600 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 한 달치 전체를 받는다. 동시 호출은 429가 나므로 순차로 부르고, 429면 잠시 뒤 한 번만 다시 부른다 */
async function fetchMonth(kind: TradeKind, sggCd: string, ym: string, key: string, count: () => void): Promise<Record<string, unknown>[]> {
  const svc = SERVICE[kind];
  const all: Record<string, unknown>[] = [];
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ serviceKey: key, LAWD_CD: sggCd, DEAL_YMD: ym, numOfRows: String(NUM_OF_ROWS), pageNo: String(page), _type: "json" });
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvc${svc}/getRTMSDataSvc${svc}?${qs}`;
    count();
    let res = await fetch(url, { cache: "no-store" });
    if (res.status === 429) {
      await sleep(2000);
      count();
      res = await fetch(url, { cache: "no-store" });
    }
    if (res.status === 401 || res.status === 403) throw new Error(`${svc} 사용 승인이 필요합니다 (${res.status})`);
    if (!res.ok) throw new Error(`${svc} 요청 실패 (${res.status})`);
    const { items, total } = molitItems(JSON.parse(await res.text()));
    all.push(...items);
    if (items.length === 0 || all.length >= total) return all;
    await sleep(350);
  }
}

async function saveTrades(admin: Admin, rows: TradeRow[]) {
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin
      .from("commercial_land_trades")
      .upsert(rows.slice(i, i + 200).map((r) => ({ ...r, updated_at: now })), { onConflict: "trade_key" });
    if (error) throw new Error(`저장 실패: ${error.message}`);
  }
}

/** 호출 수를 하루 단위로 센다. 토지가 한도에 가까우면 그날은 토지를 건너뛴다 */
export class Usage {
  private counts: Record<string, number> = { building: 0, land: 0 };
  private constructor(private admin: Admin, private day: string) {}
  static async load(admin: Admin, now: Date) {
    const u = new Usage(admin, kstDay(now));
    const { data } = await admin.from("commercial_land_api_usage").select("kind, calls").eq("day", u.day);
    for (const r of (data ?? []) as { kind: string; calls: number }[]) u.counts[r.kind] = r.calls;
    return u;
  }
  add(kind: TradeKind) {
    this.counts[kind]++;
  }
  landFull() {
    return this.counts.land >= LAND_DAILY_GUARD;
  }
  async save() {
    await this.admin.from("commercial_land_api_usage").upsert(
      Object.entries(this.counts).map(([kind, calls]) => ({ day: this.day, kind, calls })),
      { onConflict: "day,kind" },
    );
  }
}

/** 한 지역 수집. 한 자료가 막혀도 나머지는 저장하고, 오류는 상태에 남겨 화면에 보여 준다 */
export async function collectRegion(admin: Admin, region: { sgg_cd: string; sgg_nm: string }, usage: Usage, now = new Date()) {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다.");
  const { data: state } = await admin.from("commercial_land_region_state").select("*").eq("sgg_cd", region.sgg_cd).maybeSingle();
  const backfill: number = state?.backfill_months ?? 0;
  const offsets = [0, 1, ...(backfill < MAX_BACKFILL_MONTHS ? [2 + backfill] : [])];

  const errors: string[] = [];
  let saved = 0;
  for (const kind of ["building", "land"] as TradeKind[]) {
    if (kind === "land" && usage.landFull()) {
      errors.push("토지 자료 하루 호출 한도에 가까워 다음에 이어서 받습니다");
      continue;
    }
    try {
      for (const off of offsets) {
        const items = await fetchMonth(kind, region.sgg_cd, monthKey(now, off), key, () => usage.add(kind));
        const rows = parseTrades(kind, items, region.sgg_cd, region.sgg_nm);
        await saveTrades(admin, rows);
        saved += rows.length;
        await sleep(350);
      }
    } catch (err) {
      console.error(`${region.sgg_nm} ${kind} 수집 실패:`, err);
      errors.push(`${kindLabel(kind)}: ${err instanceof Error ? err.message : "수집 실패"}`);
    }
  }

  const ok = errors.length === 0;
  const stamp = new Date();
  await admin.from("commercial_land_region_state").upsert(
    {
      sgg_cd: region.sgg_cd,
      sgg_nm: region.sgg_nm,
      // 첫 수집분은 새 거래가 아니므로 이 시각 뒤에 처음 본 줄만 알린다
      first_collected_at: state?.first_collected_at ?? (errors.length < 2 ? stamp.toISOString() : null),
      last_attempt_at: stamp.toISOString(),
      last_success_at: ok ? stamp.toISOString() : state?.last_success_at ?? null,
      next_due_at: new Date(stamp.getTime() + (ok ? SUCCESS_NEXT_MS : RETRY_NEXT_MS)).toISOString(),
      backfill_months: ok && backfill < MAX_BACKFILL_MONTHS ? backfill + 1 : backfill,
      last_error: ok ? null : errors.join(" / "),
    },
    { onConflict: "sgg_cd" },
  );
  return { saved, errors };
}

/** 회원 본인 봇: 이 프로그램에 연결한 봇을 먼저, 없으면 다른 프로그램에 한 번 연결한 본인 봇을 재사용한다 */
export async function telegramLinkFor(admin: Admin, userId: string) {
  const { data } = await admin
    .from("user_telegram_links")
    .select("program_slug, bot_token, chat_id, bot_username, linked_at")
    .eq("user_id", userId)
    .order("linked_at", { ascending: false });
  const links = ((data ?? []) as { program_slug: string; bot_token: string | null; chat_id: string; bot_username: string | null }[]).filter((l) => l.bot_token);
  return links.find((l) => l.program_slug === THIS_PROGRAM_SLUG) ?? links[0] ?? null;
}

/** 조건에 맞는 새 거래를 회원 본인 봇으로 보낸다. 보낸 줄만 기록해 실패하면 다음 회차에 다시 보낸다 */
export async function notifyUser(admin: Admin, userId: string, siteUrl: string, now = new Date()) {
  const { data: prefRow } = await admin.from("commercial_land_preferences").select("*").eq("user_id", userId).maybeSingle();
  const prefs = normalizePrefs(prefRow);
  if (!prefs.notify_enabled) return 0;
  // 받는 곳: 텔레그램 → 이메일 → 카카오톡. 회원 본인 봇·키·계정만 쓴다
  const link = prefRow?.notify_telegram === false ? null : await telegramLinkFor(admin, userId);
  const resend = prefRow?.notify_email && prefRow?.email_to ? await getResendKey(admin, userId) : null;
  const kakao = prefRow?.notify_kakao ? await getKakaoState(admin, userId) : null;
  const kakaoToken = kakao?.status === "ok" ? kakao.accessToken : null;
  if (!link?.bot_token && !resend && !kakaoToken) return 0;

  const { data: watches } = await admin.from("commercial_land_watch").select("sgg_cd, created_at").eq("user_id", userId).eq("is_active", true);
  const watchList = (watches ?? []) as { sgg_cd: string; created_at: string }[];
  if (!watchList.length) return 0;
  const codes = watchList.map((w) => w.sgg_cd);
  const { data: states } = await admin.from("commercial_land_region_state").select("sgg_cd, first_collected_at").in("sgg_cd", codes);
  const firstAt = new Map(((states ?? []) as { sgg_cd: string; first_collected_at: string | null }[]).map((s) => [s.sgg_cd, s.first_collected_at]));
  const watchAt = new Map(watchList.map((w) => [w.sgg_cd, w.created_at]));

  const seenSince = new Date(now.getTime() - 7 * 86400000).toISOString();
  const dealSince = new Date(now.getTime() - ALERT_RECENT_DAYS * 86400000).toISOString().slice(0, 10);
  const { data: rows } = await admin
    .from("commercial_land_trades")
    .select("id, kind, sgg_cd, sgg_nm, umd_nm, category, amount_manwon, area_m2, deal_date, is_share, cancelled, first_seen_at")
    .in("sgg_cd", codes)
    .eq("cancelled", false)
    .gte("first_seen_at", seenSince)
    .gte("deal_date", dealSince)
    .order("deal_date", { ascending: false })
    .limit(500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = ((rows ?? []) as any[]).filter((t) => {
    const first = firstAt.get(t.sgg_cd);
    if (!first) return false;
    const seen = new Date(t.first_seen_at).getTime();
    return seen > new Date(first).getTime() && seen > new Date(watchAt.get(t.sgg_cd)!).getTime() && matchesPrefs(t, prefs);
  });
  if (!candidates.length) return 0;

  const sent = new Set<string>();
  for (let i = 0; i < candidates.length; i += 100) {
    const { data } = await admin
      .from("commercial_land_user_trades")
      .select("trade_id")
      .eq("user_id", userId)
      .not("notified_at", "is", null)
      .in("trade_id", candidates.slice(i, i + 100).map((c) => c.id));
    for (const r of (data ?? []) as { trade_id: string }[]) sent.add(r.trade_id);
  }
  const toSend = candidates.filter((c) => !sent.has(c.id)).slice(0, MAX_ALERTS_PER_RUN);
  if (!toSend.length) return 0;

  const text = alertText(toSend, siteUrl);
  let sent2 = 0;
  const attempt = async (name: string, run: () => Promise<unknown>) => {
    try {
      await run();
      sent2++;
    } catch (err) {
      console.error(`${name} 알림 실패:`, err);
    }
  };
  if (link?.bot_token) await attempt("텔레그램", () => sendTelegramMessage({ botToken: link.bot_token!, chatId: link.chat_id, text }));
  if (resend) {
    await attempt("이메일", async () => {
      const r = await sendResendMail(resend, { to: prefRow.email_to, subject: `🏢 [상가·건물·토지] 새 실거래 ${toSend.length}건`, text });
      if (!r.ok) throw new Error(r.error);
    });
  }
  if (kakaoToken) {
    await attempt("카카오톡", async () => {
      const r = await sendKakaoMemo(kakaoToken, { text: kakaoAlertText(toSend), url: `${siteUrl}/trades` });
      if (!r.ok) throw new Error(r.error);
    });
  }
  if (!sent2) return 0; // 모두 실패하면 기록하지 않아 다음 회차에 다시 보낸다
  const stamp = new Date().toISOString();
  await admin.from("commercial_land_user_trades").upsert(
    toSend.map((t) => ({ user_id: userId, trade_id: t.id, notified_at: stamp })),
    { onConflict: "user_id,trade_id" },
  );
  return toSend.length;
}
