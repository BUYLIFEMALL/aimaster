import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { sendAlimtalk } from "@/lib/solapi/client";
import { summarizeNews, NEWS_DIGEST_MODEL } from "@/lib/ai/newsDigest";
import { searchNaverNews, NaverNewsError } from "./naverNews";
import { MAX_NEWS_REGIONS, buildNewsMessage, buildQueries, isNewsDue, kstDateHour, pickCandidates, regionTerms, type DigestItem, type NewsCategory, type RawNews } from "./radarCore";

// RQ-C 지역 뉴스 레이더 실행(2026-11-09, v1.57). /api/collect/dispatch(5분 예약)가 매 회차 부르고,
// 여기서 「뉴스 받기를 켠 회원 중 아침 8시가 지났고 오늘 아직 안 보낸 회원」만 하루 1번 처리한다.
// 검색은 회원 본인 네이버 키, AI 요약은 회원이 켠 경우만 회원 본인 Claude 키. 결과는 회원별로만 저장(공유 캐시 없음).

type AdminClient = ReturnType<typeof createAdminClient>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (s: AdminClient) => s as unknown as { from: (table: string) => any };

export const NEWS_PAGE_URL = "https://real-estate-sales.buylife.xyz/news";
const MAX_USERS_PER_TICK = 10;

async function userKey(supabase: AdminClient, userId: string, provider: string): Promise<string | null> {
  const { data } = await loose(supabase).from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  return (data?.api_key as string | undefined)?.trim() || null;
}

export interface NewsRunResult { userId: string; regions: number; saved: number; sent: boolean; error?: string }

/** 한 회원 처리 — 뉴스 화면의 「지금 받아 보기」에서도 같은 함수를 쓴다(notify=false면 알림 없이 저장만) */
export async function runNewsForUser(supabase: AdminClient, userId: string, opts: { now?: Date; notify?: boolean; aiSummary?: boolean; firstRun?: boolean } = {}): Promise<NewsRunResult> {
  const now = opts.now ?? new Date();
  const [clientId, clientSecret] = await Promise.all([userKey(supabase, userId, "naver_client_id"), userKey(supabase, userId, "naver_client_secret")]);
  if (!clientId || !clientSecret) return { userId, regions: 0, saved: 0, sent: false, error: "네이버 검색 키가 없습니다." };

  const { data: watch } = await supabase
    .from("real_estate_watch_districts")
    .select("sgg_cd, sgg_nm, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  const regions = Array.from(new Map((watch ?? []).map((w) => [w.sgg_cd, w.sgg_nm])).entries()).slice(0, MAX_NEWS_REGIONS);
  if (regions.length === 0) return { userId, regions: 0, saved: 0, sent: false, error: "관심 지역이 없습니다." };

  const rows: { sgg_cd: string; sgg_nm: string; category: NewsCategory; title: string; link: string; snippet: string; published_at: string | null; source: string | null }[] = [];
  for (const [sggCd, sggNm] of regions) {
    const results: { category: NewsCategory; items: RawNews[] }[] = [];
    for (const q of buildQueries(sggCd, sggNm)) {
      try {
        results.push({ category: q.category, items: await searchNaverNews({ clientId, clientSecret }, q.query, 20) });
      } catch (err) {
        // 키 오류·한도 초과면 이 회원은 오늘 멈춘다(같은 오류를 40번 부르지 않음)
        if (err instanceof NaverNewsError && (err.code === "auth" || err.code === "quota")) return { userId, regions: regions.length, saved: 0, sent: false, error: err.message };
        console.error(`지역 뉴스 검색 실패 (user ${userId}, ${q.query}):`, err);
      }
    }
    for (const c of pickCandidates(results, regionTerms(sggCd, sggNm), now)) {
      rows.push({ sgg_cd: sggCd, sgg_nm: sggNm, category: c.category, title: c.title, link: c.link, snippet: c.snippet, published_at: c.publishedAt, source: c.source });
    }
  }

  // 이미 받은 기사(같은 회원·같은 링크)는 넣지 않는다 → 새로 들어간 줄만 알림
  const withHash = rows.map((r) => ({ ...r, user_id: userId, link_hash: createHash("sha256").update(r.link).digest("hex") }));
  let inserted: typeof withHash = [];
  if (withHash.length) {
    const { data, error } = await loose(supabase)
      .from("real_estate_news_items")
      .upsert(withHash, { onConflict: "user_id,link_hash", ignoreDuplicates: true })
      .select("sgg_nm, category, title, link");
    if (error) return { userId, regions: regions.length, saved: 0, sent: false, error: error.message };
    inserted = (data ?? []) as typeof withHash;
  }

  if (opts.notify === false || inserted.length === 0) return { userId, regions: regions.length, saved: inserted.length, sent: false };

  const items: DigestItem[] = inserted.map((r) => ({ sggNm: r.sgg_nm, category: r.category, title: r.title, link: r.link }));
  let aiSummary: string | null = null;
  if (opts.aiSummary) {
    const anthropicKey = await userKey(supabase, userId, "anthropic");
    if (anthropicKey) {
      try {
        aiSummary = await summarizeNews(anthropicKey, inserted.slice(0, 40).map((r) => `[${r.sgg_nm}·${r.category}] ${r.title} — ${r.snippet ?? ""}`));
        await loose(supabase)
          .from("real_estate_news_digests")
          .upsert({ user_id: userId, digest_date: kstDateHour(now).date, content: aiSummary, ai_model: NEWS_DIGEST_MODEL }, { onConflict: "user_id,digest_date" });
      } catch (err) {
        console.error(`지역 뉴스 AI 요약 실패 (user ${userId}):`, err);
      }
    }
  }

  const sent = await sendNewsNotification(supabase, userId, items, aiSummary, opts.firstRun === true);
  return { userId, regions: regions.length, saved: inserted.length, sent };
}

async function sendNewsNotification(supabase: AdminClient, userId: string, items: DigestItem[], aiSummary: string | null, firstRun: boolean): Promise<boolean> {
  const [{ data: telegramLink }, { data: solapiAccount }, { data: kakaoTemplate }, { data: profile }] = await Promise.all([
    supabase.from("user_telegram_links").select("bot_token, chat_id").eq("user_id", userId).eq("program_slug", "real-estate-sales").maybeSingle(),
    supabase.from("user_solapi_accounts").select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id").eq("user_id", userId).maybeSingle(),
    supabase.from("real_estate_kakao_templates").select("template_id").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("phone").eq("id", userId).maybeSingle(),
  ]);
  let sentAny = false;
  if (telegramLink?.bot_token && telegramLink?.chat_id) {
    try {
      await sendTelegramMessage({ botToken: telegramLink.bot_token, chatId: telegramLink.chat_id, text: buildNewsMessage(items, { withLinks: true, aiSummary, pageUrl: NEWS_PAGE_URL, firstRun }) });
      sentAny = true;
    } catch (err) {
      console.error(`지역 뉴스 텔레그램 실패 (user ${userId}):`, err);
    }
  }
  if (solapiAccount?.kakao_pf_id && kakaoTemplate?.template_id && profile?.phone) {
    try {
      await sendAlimtalk(solapiAccount, profile.phone, { templateId: kakaoTemplate.template_id, variables: { 내용: buildNewsMessage(items, { withLinks: false, aiSummary, pageUrl: NEWS_PAGE_URL, firstRun }) } });
      sentAny = true;
    } catch (err) {
      console.error(`지역 뉴스 알림톡 실패 (user ${userId}):`, err);
    }
  }
  return sentAny;
}

/** 예약 회차마다 부른다. eligible = 정지·핸드폰·이용 권한을 통과한 회원(실거래 예약 수집과 같은 판정) */
export async function runNewsRadar(supabase: AdminClient, eligible: (userIds: string[]) => Promise<Set<string>>, opts: { now?: Date; deadline?: number } = {}) {
  const now = opts.now ?? new Date();
  const { data: prefs } = await loose(supabase).from("real_estate_user_preferences").select("user_id, news_ai_summary, news_sent_on").eq("news_enabled", true);
  const due = ((prefs ?? []) as { user_id: string; news_ai_summary: boolean; news_sent_on: string | null }[]).filter((p) => isNewsDue(p.news_sent_on, now));
  if (due.length === 0) return [];
  const ok = await eligible(due.map((p) => p.user_id));
  const results: NewsRunResult[] = [];
  for (const p of due.filter((d) => ok.has(d.user_id)).slice(0, MAX_USERS_PER_TICK)) {
    if (opts.deadline && Date.now() > opts.deadline) break;
    // 먼저 「오늘 보냄」으로 적어 두어, 처리 중 시간이 끝나도 다음 회차에 같은 알림을 두 번 보내지 않는다(결과 불확실하면 다시 하지 않음)
    await loose(supabase).from("real_estate_user_preferences").update({ news_sent_on: kstDateHour(now).date }).eq("user_id", p.user_id);
    try {
      // 한 번도 보낸 적 없는 회원(news_sent_on 비어 있음)은 첫 회차 — 건수만 알린다
      results.push(await runNewsForUser(supabase, p.user_id, { now, notify: true, aiSummary: p.news_ai_summary, firstRun: !p.news_sent_on }));
    } catch (err) {
      console.error(`지역 뉴스 처리 실패 (user ${p.user_id}):`, err);
      results.push({ userId: p.user_id, regions: 0, saved: 0, sent: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results.map((r) => ({ regions: r.regions, saved: r.saved, sent: r.sent, error: r.error })); // 회원 id는 응답에 내보내지 않는다
}
