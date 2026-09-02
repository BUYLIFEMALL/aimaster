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

// Phase 18 — 관심 키워드마다 정해둔 주기로 실제 소싱 후보 상품 리스트를 검색해서, 등록해둔
// 채널(이메일/카카오톡/텔레그램/문자) 중 켜둔 것으로만 보낸다. 마진 계산 없이 "지금 이
// 키워드로 검색하면 뭐가 나오는지"만 빠르게 훑어보는 용도 — 정확한 마진은 /sourcing에서
// 직접 확인하도록 안내한다.
//
// notify_mode='changes_only'(2026-09-03 추가)면 매번 전체를 보내는 대신, 직전 실행의
// 검색결과 스냅샷(sourcing_alert_last_snapshot)과 비교해서 신규/품절추정/가격변동(5%+)이
// 있을 때만 보낸다 — 관심상품(Phase 14, lib/priceAlert.ts)과 같은 철학이지만 키워드
// 검색이라 "같은 상품"의 기준이 없어서, 상품 단건 재조회 대신 매 실행 결과를 스냅샷으로
// 저장해두고 이전 스냅샷과 비교하는 방식으로 구현했다.

type Platform = "aliexpress" | "domeggook" | "elevenst";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trending-product-finder.vercel.app";
const MAX_PRODUCTS_PER_KEYWORD = 3;
const PRICE_CHANGE_THRESHOLD_PCT = 5;

interface AlertProduct {
  platform: Platform;
  productKey: string;
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
  sourcing_alert_notify_mode?: string | null;
  sourcing_alert_last_snapshot?: unknown;
}

// changes_only 모드에서 이전 실행 결과와 비교하기 위해 trend_watchlist.sourcing_alert_last_snapshot
// (jsonb)에 저장해두는 최소 형태 — 키워드별로 [platform, productKey, priceKrw]만 남긴다.
type Snapshot = Record<string, { platform: Platform; productKey: string; priceKrw: number | null }[]>;

interface KeywordChange {
  keyword: string;
  newProducts: AlertProduct[];
  soldOutProducts: { platform: Platform; productKey: string }[];
  priceChanged: { product: AlertProduct; previousPriceKrw: number }[];
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
          .map((p) => ({ platform: "aliexpress" as const, productKey: p.productId, title: p.title, priceKrw: p.salePriceKrw, detailUrl: p.detailUrl })),
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
          .map((p) => ({ platform: "domeggook" as const, productKey: p.itemNo, title: p.title, priceKrw: p.priceKrw, detailUrl: p.detailUrl })),
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
          .map((p) => ({
            platform: "elevenst" as const,
            productKey: p.productCode,
            title: p.title,
            priceKrw: p.salePriceKrw ?? p.priceKrw,
            detailUrl: p.detailUrl,
          })),
      );
    } catch (err) {
      console.error(`[trending-product-finder] 예약 소싱 알림 11번가 검색 실패("${keyword}"):`, err);
    }
  }

  return results;
}

const PLATFORM_LABEL: Record<Platform, string> = { aliexpress: "알리익스프레스", domeggook: "도매매", elevenst: "11번가" };

function toSnapshot(byKeyword: { keyword: string; products: AlertProduct[] }[]): Snapshot {
  const snapshot: Snapshot = {};
  for (const { keyword, products } of byKeyword) {
    snapshot[keyword] = products.map((p) => ({ platform: p.platform, productKey: p.productKey, priceKrw: p.priceKrw }));
  }
  return snapshot;
}

/** 이전 스냅샷과 비교해서 새로 나타난 상품/더 이상 안 보이는 상품(품절·판매종료 추정)/
 * 가격이 5% 이상 바뀐 상품만 추려낸다(관심상품 Phase 14와 동일한 임계값). */
function diffAgainstSnapshot(
  byKeyword: { keyword: string; products: AlertProduct[] }[],
  previous: Snapshot | null,
): KeywordChange[] {
  return byKeyword.map(({ keyword, products }) => {
    const prevItems = previous?.[keyword] ?? [];
    const prevByKey = new Map(prevItems.map((p) => [`${p.platform}:${p.productKey}`, p]));
    const currentKeys = new Set(products.map((p) => `${p.platform}:${p.productKey}`));

    const newProducts: AlertProduct[] = [];
    const priceChanged: { product: AlertProduct; previousPriceKrw: number }[] = [];
    for (const p of products) {
      const prev = prevByKey.get(`${p.platform}:${p.productKey}`);
      if (!prev) {
        newProducts.push(p);
        continue;
      }
      if (prev.priceKrw != null && p.priceKrw != null) {
        const diffPct = (Math.abs(p.priceKrw - prev.priceKrw) / prev.priceKrw) * 100;
        if (diffPct >= PRICE_CHANGE_THRESHOLD_PCT) priceChanged.push({ product: p, previousPriceKrw: prev.priceKrw });
      }
    }
    const soldOutProducts = prevItems.filter((p) => !currentKeys.has(`${p.platform}:${p.productKey}`)).map((p) => ({ platform: p.platform, productKey: p.productKey }));

    return { keyword, newProducts, soldOutProducts, priceChanged };
  });
}

function hasAnyChange(changes: KeywordChange[]): boolean {
  return changes.some((c) => c.newProducts.length > 0 || c.soldOutProducts.length > 0 || c.priceChanged.length > 0);
}

function buildChangesText(categoryName: string, changes: KeywordChange[]): string {
  const lines: string[] = [`🔔 "${categoryName}" 예약 소싱 알림 — 변경사항`, ""];
  for (const c of changes) {
    if (c.newProducts.length === 0 && c.soldOutProducts.length === 0 && c.priceChanged.length === 0) continue;
    lines.push(`■ ${c.keyword}`);
    for (const p of c.newProducts) {
      lines.push(`  🆕 [${PLATFORM_LABEL[p.platform]}] ${p.title} — ${p.priceKrw != null ? `${p.priceKrw.toLocaleString()}원` : "가격정보없음"}`);
    }
    for (const { product, previousPriceKrw } of c.priceChanged) {
      const direction = (product.priceKrw ?? 0) > previousPriceKrw ? "인상" : "인하";
      lines.push(`  💰 [${PLATFORM_LABEL[product.platform]}] ${product.title} — 가격 ${direction} (${previousPriceKrw.toLocaleString()}원 → ${product.priceKrw?.toLocaleString()}원)`);
    }
    for (const s of c.soldOutProducts) {
      lines.push(`  ⛔ [${PLATFORM_LABEL[s.platform]}] 판매종료/검색 안 됨으로 추정되는 상품이 있어요`);
    }
    lines.push("");
  }
  lines.push(`상세 확인: ${APP_URL}/sourcing`);
  return lines.join("\n");
}

function buildChangesHtml(categoryName: string, changes: KeywordChange[]): string {
  const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const sections = changes
    .filter((c) => c.newProducts.length > 0 || c.soldOutProducts.length > 0 || c.priceChanged.length > 0)
    .map((c) => {
      const rows = [
        ...c.newProducts.map(
          (p) =>
            `<div style="padding:6px 0;"><span style="color:#059669;font-weight:700;">🆕 신규</span> [${PLATFORM_LABEL[p.platform]}] ${escapeHtml(p.title)} — ${p.priceKrw != null ? `${p.priceKrw.toLocaleString()}원` : "가격정보없음"}</div>`,
        ),
        ...c.priceChanged.map(({ product, previousPriceKrw }) => {
          const direction = (product.priceKrw ?? 0) > previousPriceKrw ? "인상" : "인하";
          return `<div style="padding:6px 0;"><span style="color:#0284c7;font-weight:700;">💰 가격${direction}</span> [${PLATFORM_LABEL[product.platform]}] ${escapeHtml(product.title)} — ${previousPriceKrw.toLocaleString()}원 → ${product.priceKrw?.toLocaleString()}원</div>`;
        }),
        ...c.soldOutProducts.map(
          (s) => `<div style="padding:6px 0;"><span style="color:#dc2626;font-weight:700;">⛔ 품절/판매종료 추정</span> [${PLATFORM_LABEL[s.platform]}]</div>`,
        ),
      ].join("");
      return `<div style="margin-bottom:16px;"><p style="font-weight:700;color:#111;font-size:15px;margin:0 0 4px;">■ ${escapeHtml(c.keyword)}</p>${rows}</div>`;
    })
    .join("");

  return `
  <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="margin:0 0 4px;font-size:20px;">🔔 ${escapeHtml(categoryName)} 예약 소싱 알림 — 변경사항</h2>
    <p style="color:#666;font-size:13px;margin:0 0 16px;">이전 확인 대비 새로 나타나거나, 가격이 바뀌었거나, 더 이상 안 보이는 상품만 모았습니다.</p>
    ${sections}
    <a href="${APP_URL}/sourcing"
      style="display:inline-block;margin-top:12px;padding:12px 22px;background:#0284c7;color:#fff;
      text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
      상품소싱 마진계산기 열기
    </a>
    <p style="color:#999;font-size:11px;margin-top:28px;line-height:1.5;">
      이 메일은 상품소싱 자동화의 예약 소싱 알림(변경사항만 발송)입니다. 알림을 원하지 않으시면
      설정 페이지의 관심 키워드에서 예약 발송을 꺼주세요.
    </p>
  </div>`;
}

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
): Promise<{ ok: boolean; error?: string; snapshot?: Snapshot; notified?: boolean }> {
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

  const newSnapshot = toSnapshot(byKeyword);
  const isChangesOnly = watchlist.sourcing_alert_notify_mode === "changes_only";

  let shouldSend = true;
  let text: string;
  let html: string;

  if (isChangesOnly) {
    const previousSnapshot = (watchlist.sourcing_alert_last_snapshot as Snapshot | null) ?? null;
    const changes = diffAgainstSnapshot(byKeyword, previousSnapshot);
    shouldSend = previousSnapshot != null && hasAnyChange(changes);
    text = buildChangesText(watchlist.category_name, changes);
    html = buildChangesHtml(watchlist.category_name, changes);
  } else {
    text = buildText(watchlist.category_name, byKeyword);
    html = buildHtml(watchlist.category_name, byKeyword);
  }

  if (shouldSend) {
    if (channels.has("email") && userData.user?.email && smtpAccount) {
      try {
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
  }

  return { ok: true, snapshot: newSnapshot, notified: shouldSend };
}
