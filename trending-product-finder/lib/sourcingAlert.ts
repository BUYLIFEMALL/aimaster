import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchProducts as searchAliexpress } from "@/lib/aliexpress/client";
import { searchProducts as searchDomeggook } from "@/lib/domeggook/client";
import { searchProducts as searchElevenst } from "@/lib/elevenst/client";
import { translateToEnglishKeyword } from "@/lib/ai/translateKeyword";
import { sendViaSmtpAccount } from "@/lib/email/transport";
import { sendFriendtalk, sendSms } from "@/lib/solapi/client";
import { sendTelegramMessage } from "@/lib/telegram/client";
import type { AlertChannel } from "@/lib/constants";
import type { Database } from "@/types/database.types";

// Phase 12 — 관심 키워드마다 정해둔 주기로 실제 소싱 후보 상품 리스트를 검색해서, 등록해둔
// 채널(이메일/카카오톡/텔레그램/문자) 중 켜둔 것으로만 보낸다. 마진 계산 없이 "지금 이
// 키워드로 검색하면 뭐가 나오는지"만 빠르게 훑어보는 용도 — 정확한 마진은 /sourcing에서
// 직접 확인하도록 안내한다.

type Platform = "aliexpress" | "domeggook" | "elevenst";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trending-product-finder.vercel.app";
const MAX_PRODUCTS_PER_KEYWORD = 3;

interface AlertProduct {
  platform: Platform;
  title: string;
  priceKrw: number | null;
  detailUrl: string;
}

export interface AlertWatchlistRow {
  id: string;
  user_id: string;
  category_name: string;
  keywords: string[];
  sourcing_alert_channels: string[];
}

async function fetchTopProducts(
  keyword: string,
  auth: {
    aliexpress?: { appKey: string; appSecret: string; trackingId: string } | null;
    domeggook?: { apiKey: string } | null;
    elevenst?: { apiKey: string } | null;
    openaiKey?: string | null;
    geminiKey?: string | null;
  },
): Promise<AlertProduct[]> {
  const results: AlertProduct[] = [];

  if (auth.aliexpress) {
    try {
      const { keyword: searchKeyword } = await translateToEnglishKeyword(keyword, {
        openai: auth.openaiKey,
        gemini: auth.geminiKey,
      });
      const products = await searchAliexpress(searchKeyword, { ...auth.aliexpress, pageSize: MAX_PRODUCTS_PER_KEYWORD });
      results.push(
        ...products
          .slice(0, MAX_PRODUCTS_PER_KEYWORD)
          .map((p) => ({ platform: "aliexpress" as const, title: p.title, priceKrw: p.salePriceKrw, detailUrl: p.detailUrl })),
      );
    } catch (err) {
      console.error(`[trending-product-finder] 예약 소싱 알림 알리익스프레스 검색 실패("${keyword}"):`, err);
    }
  }

  if (auth.domeggook) {
    try {
      const products = await searchDomeggook(keyword, { ...auth.domeggook, pageSize: MAX_PRODUCTS_PER_KEYWORD });
      results.push(
        ...products
          .slice(0, MAX_PRODUCTS_PER_KEYWORD)
          .map((p) => ({ platform: "domeggook" as const, title: p.title, priceKrw: p.priceKrw, detailUrl: p.detailUrl })),
      );
    } catch (err) {
      console.error(`[trending-product-finder] 예약 소싱 알림 도매매 검색 실패("${keyword}"):`, err);
    }
  }

  if (auth.elevenst) {
    try {
      const products = await searchElevenst(keyword, { ...auth.elevenst, pageSize: MAX_PRODUCTS_PER_KEYWORD });
      results.push(
        ...products
          .slice(0, MAX_PRODUCTS_PER_KEYWORD)
          .map((p) => ({ platform: "elevenst" as const, title: p.title, priceKrw: p.salePriceKrw ?? p.priceKrw, detailUrl: p.detailUrl })),
      );
    } catch (err) {
      console.error(`[trending-product-finder] 예약 소싱 알림 11번가 검색 실패("${keyword}"):`, err);
    }
  }

  return results;
}

const PLATFORM_LABEL: Record<Platform, string> = { aliexpress: "알리익스프레스", domeggook: "도매매", elevenst: "11번가" };

function buildText(categoryName: string, byKeyword: { keyword: string; products: AlertProduct[] }[]): string {
  const lines: string[] = [`🔔 "${categoryName}" 예약 소싱 알림`, ""];
  for (const { keyword, products } of byKeyword) {
    lines.push(`■ ${keyword}`);
    if (products.length === 0) {
      lines.push("  검색된 상품이 없습니다.");
    } else {
      for (const p of products) {
        lines.push(`  • [${PLATFORM_LABEL[p.platform]}] ${p.title} — ${p.priceKrw != null ? `${p.priceKrw.toLocaleString()}원` : "가격정보없음"}`);
      }
    }
    lines.push("");
  }
  lines.push(`상세 확인: ${APP_URL}/sourcing`);
  return lines.join("\n");
}

function buildHtml(categoryName: string, byKeyword: { keyword: string; products: AlertProduct[] }[]): string {
  const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const sections = byKeyword
    .map(({ keyword, products }) => {
      const rows = products
        .map(
          (p) => `
            <div style="padding:8px 0;border-bottom:1px solid #f1f1f1;">
              <span style="color:#0284c7;font-weight:700;font-size:12px;">[${PLATFORM_LABEL[p.platform]}]</span>
              <span style="color:#111;font-size:14px;"> ${escapeHtml(p.title)}</span>
              <div style="color:#555;font-size:13px;margin-top:2px;">${p.priceKrw != null ? `${p.priceKrw.toLocaleString()}원` : "가격정보없음"}</div>
            </div>`,
        )
        .join("");
      return `
        <div style="margin-bottom:16px;">
          <p style="font-weight:700;color:#111;font-size:15px;margin:0 0 4px;">■ ${escapeHtml(keyword)}</p>
          ${rows || '<p style="color:#999;font-size:13px;">검색된 상품이 없습니다.</p>'}
        </div>`;
    })
    .join("");

  return `
  <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="margin:0 0 4px;font-size:20px;">🔔 ${escapeHtml(categoryName)} 예약 소싱 알림</h2>
    <p style="color:#666;font-size:13px;margin:0 0 16px;">등록해두신 키워드로 지금 검색한 소싱 후보 상품입니다(키워드당 상위 ${MAX_PRODUCTS_PER_KEYWORD}건).</p>
    ${sections}
    <a href="${APP_URL}/sourcing"
      style="display:inline-block;margin-top:12px;padding:12px 22px;background:#0284c7;color:#fff;
      text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
      상품소싱 마진계산기 열기
    </a>
    <p style="color:#999;font-size:11px;margin-top:28px;line-height:1.5;">
      이 메일은 상품소싱 자동화의 예약 소싱 알림입니다. 알림을 원하지 않으시면 설정 페이지의
      관심 키워드에서 예약 발송을 꺼주세요.
    </p>
  </div>`;
}

export async function runSourcingAlertForWatchlist(
  supabase: SupabaseClient<Database>,
  watchlist: AlertWatchlistRow,
): Promise<{ ok: boolean; error?: string }> {
  const channels = new Set(watchlist.sourcing_alert_channels as AlertChannel[]);
  if (channels.size === 0) return { ok: true };

  const [appKey, appSecret, trackingId, domeggookKey, elevenstKey, openaiKey, geminiKey] = await Promise.all([
    resolveApiKey(supabase, watchlist.user_id, "aliexpress_app_key"),
    resolveApiKey(supabase, watchlist.user_id, "aliexpress_app_secret"),
    resolveApiKey(supabase, watchlist.user_id, "aliexpress_tracking_id"),
    resolveApiKey(supabase, watchlist.user_id, "domeggook_api_key"),
    resolveApiKey(supabase, watchlist.user_id, "elevenst_api_key"),
    resolveApiKey(supabase, watchlist.user_id, "openai"),
    resolveApiKey(supabase, watchlist.user_id, "gemini"),
  ]);

  const auth = {
    aliexpress: appKey && appSecret && trackingId ? { appKey, appSecret, trackingId } : null,
    domeggook: domeggookKey ? { apiKey: domeggookKey } : null,
    elevenst: elevenstKey ? { apiKey: elevenstKey } : null,
    openaiKey,
    geminiKey,
  };

  if (!auth.aliexpress && !auth.domeggook && !auth.elevenst) {
    return { ok: false, error: "등록된 소싱 채널 API 키가 없습니다." };
  }

  const byKeyword = await Promise.all(
    watchlist.keywords.map(async (keyword) => ({ keyword, products: await fetchTopProducts(keyword, auth) })),
  );

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const [{ data: userData }, { data: profile }, { data: smtpAccount }, { data: solapiAccount }, { data: telegramLink }] =
    await Promise.all([
      admin.auth.admin.getUserById(watchlist.user_id),
      admin.from("profiles").select("phone").eq("id", watchlist.user_id).maybeSingle(),
      admin
        .from("user_smtp_accounts")
        .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name")
        .eq("user_id", watchlist.user_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      admin
        .from("user_solapi_accounts")
        .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
        .eq("user_id", watchlist.user_id)
        .maybeSingle(),
      admin
        .from("user_telegram_links")
        .select("bot_token, chat_id")
        .eq("user_id", watchlist.user_id)
        .eq("program_slug", "trending-product-finder")
        .maybeSingle(),
    ]);

  const text = buildText(watchlist.category_name, byKeyword);

  if (channels.has("email") && userData.user?.email && smtpAccount) {
    try {
      const html = buildHtml(watchlist.category_name, byKeyword);
      await sendViaSmtpAccount(smtpAccount, userData.user.email, `[상품소싱 자동화] "${watchlist.category_name}" 예약 소싱 알림`, html);
    } catch (err) {
      console.error(`[trending-product-finder] "${watchlist.category_name}" 예약 알림 이메일 발송 실패:`, err);
    }
  }

  if (channels.has("kakao") && profile?.phone && solapiAccount?.kakao_pf_id) {
    try {
      await sendFriendtalk(solapiAccount, profile.phone, text);
    } catch (err) {
      console.error(`[trending-product-finder] "${watchlist.category_name}" 예약 알림 카카오톡 발송 실패:`, err);
    }
  }

  if (channels.has("sms") && profile?.phone && solapiAccount) {
    try {
      await sendSms(solapiAccount, profile.phone, text.slice(0, 2000));
    } catch (err) {
      console.error(`[trending-product-finder] "${watchlist.category_name}" 예약 알림 문자 발송 실패:`, err);
    }
  }

  if (channels.has("telegram") && telegramLink?.bot_token && telegramLink?.chat_id) {
    try {
      await sendTelegramMessage({ botToken: telegramLink.bot_token, chatId: telegramLink.chat_id, text });
    } catch (err) {
      console.error(`[trending-product-finder] "${watchlist.category_name}" 예약 알림 텔레그램 발송 실패:`, err);
    }
  }

  return { ok: true };
}
