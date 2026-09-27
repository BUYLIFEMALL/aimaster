import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function extractAliexpressProductId(url) {
  if (!url) return null;
  const decoded = decodeURIComponent(url);
  const match =
    decoded.match(/item\/(\d+)\.html/i) ||
    decoded.match(/\/(\d+)\.html/i) ||
    decoded.match(/productId=(\d+)/i) ||
    decoded.match(/product\/(\d+)/i) ||
    decoded.match(/\/(\d{10,18})\.html/i) ||
    decoded.match(/(\d{10,18})/);
  return match ? match[1] : null;
}

async function resolveAliexpressUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed || /item\/\d+\.html/i.test(trimmed)) return trimmed;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    clearTimeout(timeoutId);
    if (res.url && res.url !== trimmed) return res.url;
  } catch (e) {
    console.warn("Failed to resolve URL:", e.message);
  }
  return trimmed;
}

function signParams(params, appSecret) {
  const sortedKeys = Object.keys(params).sort();
  const base = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  const raw = `${appSecret}${base}${appSecret}`;
  return crypto.createHash("md5").update(raw, "utf8").digest("hex").toUpperCase();
}

async function getProductDetails(productIds, auth) {
  const validIds = productIds.filter(Boolean);
  if (validIds.length === 0) return [];
  try {
    const timestamp = String(Date.now());
    const params = {
      app_key: auth.appKey,
      method: "aliexpress.affiliate.productdetail.get",
      timestamp,
      sign_method: "md5",
      format: "json",
      v: "2.0",
      product_ids: validIds.join(","),
      tracking_id: auth.trackingId,
      target_currency: "KRW",
      target_language: "KO",
    };
    params.sign = signParams(params, auth.appSecret);
    const res = await fetch("https://api-sg.aliexpress.com/sync", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product ?? [];
    return list.map((p) => {
      let img = p.product_main_image_url || p.product_small_image_urls?.string?.[0];
      if (img) {
        img = img.trim();
        if (img.startsWith("//")) img = `https:${img}`;
        else if (img.startsWith("http://")) img = img.replace("http://", "https://");
      }
      return { productId: String(p.product_id ?? ""), imageUrl: img };
    });
  } catch (err) {
    console.error("getProductDetails error:", err.message);
    return [];
  }
}

async function tryFetchOgImage(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Cookie: "aep_usuc_f=site=kor&c_tp=KRW&region=KR; intl_locale=ko_KR;",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/"product_main_image_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/"image"\s*:\s*\[?\s*"([^"]+)"/i);
    let img = match ? match[1] : null;
    if (img) {
      img = img.trim().replace(/\\/g, "");
      if (img.startsWith("//")) img = `https:${img}`;
      else if (img.startsWith("http://")) img = img.replace("http://", "https://");
    }
    return img;
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log("Fetching aliexpress products from DB...");
  const { data: products, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("platform", "aliexpress");

  if (error) {
    console.error("DB query error:", error);
    return;
  }

  console.log(`Found ${products.length} aliexpress products.`);

  // 사용자의 알리익스프레스 키 조회를 위한 테이블 캐시
  const { data: apiKeys } = await supabase.from("user_api_keys").select("*");

  for (const prod of products) {
    console.log(`\nChecking Product ID: ${prod.id}, Name: ${prod.product_name}`);
    console.log(`Current image_url: ${prod.image_url}`);
    
    let newImageUrl = prod.image_url;

    // 만약 image_url이 없거나 http로 시작하는 등 보정이 필요한 경우
    if (!newImageUrl || newImageUrl.startsWith("http://") || newImageUrl.startsWith("//")) {
      const userKeys = (apiKeys || []).filter((k) => k.user_id === prod.user_id);
      const appKeyKey = userKeys.find((k) => k.provider === "aliexpress_app_key");
      const appSecretKey = userKeys.find((k) => k.provider === "aliexpress_app_secret");
      const trackingIdKey = userKeys.find((k) => k.provider === "aliexpress_tracking_id");

      const resolvedUrl = await resolveAliexpressUrl(prod.product_url || prod.affiliate_url);
      const aliexpressId = extractAliexpressProductId(resolvedUrl) || extractAliexpressProductId(prod.product_url);

      if (appKeyKey?.api_key && appSecretKey?.api_key && trackingIdKey?.api_key && aliexpressId) {
        console.log(`Calling TOP API for productId: ${aliexpressId}...`);
        const details = await getProductDetails([aliexpressId], {
          appKey: appKeyKey.api_key,
          appSecret: appSecretKey.api_key,
          trackingId: trackingIdKey.api_key,
        });
        if (details.length > 0 && details[0].imageUrl) {
          newImageUrl = details[0].imageUrl;
          console.log(`TOP API returned image: ${newImageUrl}`);
        }
      }

      if (!newImageUrl && resolvedUrl) {
        console.log(`Fetching OG image for resolvedUrl: ${resolvedUrl}...`);
        newImageUrl = await tryFetchOgImage(resolvedUrl);
      }

      if (!newImageUrl && prod.product_url) {
        console.log(`Fetching OG image for product_url: ${prod.product_url}...`);
        newImageUrl = await tryFetchOgImage(prod.product_url);
      }

      if (newImageUrl) {
        if (newImageUrl.startsWith("//")) newImageUrl = `https:${newImageUrl}`;
        else if (newImageUrl.startsWith("http://")) newImageUrl = newImageUrl.replace("http://", "https://");

        console.log(`Updating product ${prod.id} with new image_url: ${newImageUrl}`);
        const { error: updateErr } = await supabase
          .from("affiliate_products")
          .update({ image_url: newImageUrl })
          .eq("id", prod.id);

        if (updateErr) {
          console.error(`Failed to update ${prod.id}:`, updateErr);
        } else {
          console.log(`Successfully updated ${prod.id}!`);
        }
      } else {
        console.log(`Could not find image for product ${prod.id}`);
      }
    }
  }
}

run();

