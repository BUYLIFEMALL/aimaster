import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function tryFetchOgImage(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    let img = match ? match[1] : null;
    if (img && img.startsWith("//")) img = `https:${img}`;
    return img;
  } catch (err) {
    console.error("fetchOgImage error:", err.message);
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

  for (const prod of products) {
    console.log(`Product ID: ${prod.id}, Name: ${prod.product_name}, Current image_url: ${prod.image_url}`);
    
    let newImageUrl = null;

    if (prod.product_url) {
      newImageUrl = await tryFetchOgImage(prod.product_url);
    }

    if (!newImageUrl && prod.affiliate_url) {
      newImageUrl = await tryFetchOgImage(prod.affiliate_url);
    }

    if (newImageUrl) {
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

run();
