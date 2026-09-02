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

// Phase 14 — 관심 상품(찜)의 가격·품절 상태를 재확인해서, 실제로 바뀐 경우에만 알린다.
// Phase 18(예약 소싱 알림)과 달리 "변화가 없으면 알림 없음"이 핵심 — real_estate_sales의
// "새로 생긴 것만 알림" 철학과 같은 방향이되, 여기서는 신규 등장이 아니라 저장해둔 상품
// 1건의 이전 상태 대비 변화를 비교한다.
//
// 상품 ID로 단건 재조회하는 API를 새로 만들지 않고, 저장할 때 쓴 키워드로 다시 검색해서
// 그 결과 안에서 같은 product_key를 찾는 방식으로 구현한다 — 검색 결과 상위 페이지 안에
// 더 이상 안 보이면 품절/판매중단으로 "추정"한다(완전히 정확하진 않지만, 플랫폼별 단건
// 조회 API를 새로 붙이는 것보다 훨씬 낮은 리스크로 기존 검색 클라이언트를 재사용할 수 있다).

const PRICE_CHANGE_THRESHOLD_PCT = 5;
const SEARCH_PAGE_SIZE = 30;

export interface SavedProductRow {
  id: string;
  user_id: string;
  keyword: string;
  platform: "aliexpress" | "domeggook" | "elevenst";
  product_key: string;
  title: string;
  detail_url: string;
  last_price_krw: number | null;
  last_status: "in_stock" | "out_of_stock";
  alert_channels: string[];
}

interface CurrentState {
  priceKrw: number | null;
  status: "in_stock" | "out_of_stock";
  title: string;
  detailUrl: string;
}

async function fetchCurrentState(row: SavedProductRow, supabase: SupabaseClient<Database>): Promise<CurrentState> {
  if (row.platform === "aliexpress") {
    const [appKey, appSecret, trackingId, openaiKey, geminiKey] = await Promise.all([
      resolveApiKey(supabase, row.user_id, "aliexpress_app_key"),
      resolveApiKey(supabase, row.user_id, "aliexpress_app_secret"),
      resolveApiKey(supabase, row.user_id, "aliexpress_tracking_id"),
      resolveApiKey(supabase, row.user_id, "openai"),
      resolveApiKey(supabase, row.user_id, "gemini"),
    ]);
    if (!appKey || !appSecret || !trackingId) throw new Error("알리익스프레스 API 키 미등록");
    const { keyword: searchKeyword } = await translateToEnglishKeyword(row.keyword, { openai: openaiKey, gemini: geminiKey });
    const products = await searchAliexpress(searchKeyword, { appKey, appSecret, trackingId, pageSize: SEARCH_PAGE_SIZE });
    const found = products.find((p) => p.productId === row.product_key);
    if (!found) return { priceKrw: null, status: "out_of_stock", title: row.title, detailUrl: row.detail_url };
    return { priceKrw: found.salePriceKrw, status: "in_stock", title: found.title, detailUrl: found.detailUrl };
  }

  if (row.platform === "domeggook") {
    const apiKey = await resolveApiKey(supabase, row.user_id, "domeggook_api_key");
    if (!apiKey) throw new Error("도매매 API 키 미등록");
    const products = await searchDomeggook(row.keyword, { apiKey, pageSize: SEARCH_PAGE_SIZE });
    const found = products.find((p) => p.itemNo === row.product_key);
    if (!found) return { priceKrw: null, status: "out_of_stock", title: row.title, detailUrl: row.detail_url };
    return { priceKrw: found.priceKrw, status: "in_stock", title: found.title, detailUrl: found.detailUrl };
  }

  const apiKey = await resolveApiKey(supabase, row.user_id, "elevenst_api_key");
  if (!apiKey) throw new Error("11번가 API 키 미등록");
  const products = await searchElevenst(row.keyword, { apiKey, pageSize: SEARCH_PAGE_SIZE });
  const found = products.find((p) => p.productCode === row.product_key);
  if (!found) return { priceKrw: null, status: "out_of_stock", title: row.title, detailUrl: row.detail_url };
  return { priceKrw: found.salePriceKrw ?? found.priceKrw, status: "in_stock", title: found.title, detailUrl: found.detailUrl };
}

function hasMeaningfulChange(row: SavedProductRow, current: CurrentState): { changed: boolean; reason: string } {
  if (row.last_status === "in_stock" && current.status === "out_of_stock") {
    return { changed: true, reason: "품절(또는 판매중단)로 추정됩니다" };
  }
  if (row.last_status === "out_of_stock" && current.status === "in_stock") {
    return { changed: true, reason: "다시 검색결과에 나타났습니다(재입고 추정)" };
  }
  if (current.status === "in_stock" && row.last_price_krw != null && current.priceKrw != null) {
    const diffPct = (Math.abs(current.priceKrw - row.last_price_krw) / row.last_price_krw) * 100;
    if (diffPct >= PRICE_CHANGE_THRESHOLD_PCT) {
      const direction = current.priceKrw > row.last_price_krw ? "인상" : "인하";
      return { changed: true, reason: `가격이 ${direction}됐습니다 (${row.last_price_krw.toLocaleString()}원 → ${current.priceKrw.toLocaleString()}원)` };
    }
  }
  return { changed: false, reason: "" };
}

export async function checkSavedProduct(
  supabase: SupabaseClient<Database>,
  row: SavedProductRow,
): Promise<{ ok: boolean; changed: boolean; current?: CurrentState; error?: string }> {
  let current: CurrentState;
  try {
    current = await fetchCurrentState(row, supabase);
  } catch (err) {
    return { ok: false, changed: false, error: err instanceof Error ? err.message : "조회 실패" };
  }

  const { changed, reason } = hasMeaningfulChange(row, current);

  if (changed && row.alert_channels.length > 0) {
    try {
      await notifyChange(supabase, row, current, reason);
    } catch (err) {
      console.error(`[trending-product-finder] 관심상품 변경 알림 발송 실패(${row.id}):`, err);
    }
  }

  return { ok: true, changed, current };
}

async function notifyChange(supabase: SupabaseClient<Database>, row: SavedProductRow, current: CurrentState, reason: string) {
  const channels = new Set(row.alert_channels as AlertChannel[]);
  const priceText = current.priceKrw != null ? `${current.priceKrw.toLocaleString()}원` : "가격정보없음";
  const text = [`🔔 관심상품 변경 알림`, "", row.title, reason, `현재가: ${priceText}`, "", `상품 링크: ${current.detailUrl}`].join("\n");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const [{ data: userData }, { data: profile }, { data: smtpAccount }, { data: solapiAccount }, { data: telegramLink }] =
    await Promise.all([
      admin.auth.admin.getUserById(row.user_id),
      admin.from("profiles").select("phone").eq("id", row.user_id).maybeSingle(),
      admin
        .from("user_smtp_accounts")
        .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name")
        .eq("user_id", row.user_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      admin
        .from("user_solapi_accounts")
        .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
        .eq("user_id", row.user_id)
        .maybeSingle(),
      admin
        .from("user_telegram_links")
        .select("bot_token, chat_id")
        .eq("user_id", row.user_id)
        .eq("program_slug", "trending-product-finder")
        .maybeSingle(),
    ]);

  if (channels.has("email") && userData.user?.email && smtpAccount) {
    try {
      const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;">
        <h2 style="margin:0 0 8px;">🔔 관심상품 변경 알림</h2>
        <p style="font-weight:700;">${row.title}</p>
        <p style="color:#0284c7;">${reason}</p>
        <p>현재가: ${priceText}</p>
        <a href="${current.detailUrl}" style="display:inline-block;margin-top:12px;padding:10px 18px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px;">상품 보러가기</a>
      </div>`;
      await sendViaSmtpAccount(smtpAccount, userData.user.email, `[상품소싱 자동화] 관심상품 변경: ${row.title.slice(0, 30)}`, html);
    } catch (err) {
      console.error("관심상품 이메일 알림 실패:", err);
    }
  }
  if (channels.has("kakao") && profile?.phone && solapiAccount?.kakao_pf_id) {
    try {
      await sendFriendtalk(solapiAccount, profile.phone, text);
    } catch (err) {
      console.error("관심상품 카카오톡 알림 실패:", err);
    }
  }
  if (channels.has("sms") && profile?.phone && solapiAccount) {
    try {
      await sendSms(solapiAccount, profile.phone, text.slice(0, 2000));
    } catch (err) {
      console.error("관심상품 문자 알림 실패:", err);
    }
  }
  if (channels.has("telegram") && telegramLink?.bot_token && telegramLink?.chat_id) {
    try {
      await sendTelegramMessage({ botToken: telegramLink.bot_token, chatId: telegramLink.chat_id, text });
    } catch (err) {
      console.error("관심상품 텔레그램 알림 실패:", err);
    }
  }
}
