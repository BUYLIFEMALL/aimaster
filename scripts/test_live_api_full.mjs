import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.replace(/\r/g, "").trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()));

async function testFull() {
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "buylifemall@naver.com",
  });

  const { data: sessionData } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  const session = sessionData.session;
  console.log("Logged in session user:", session.user.email);

  let cookieJar = {};
  const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()), {
    cookies: {
      getAll() {
        return Object.entries(cookieJar).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookieJar[name] = value;
        });
      },
    },
  });

  await ssr.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  const cookieHeader = Object.entries(cookieJar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  // 1. viral-shorts (쇼츠 검색) 테스트 - "AI자동화"
  console.log("\n=== 1. Testing /api/youtube/search-shorts (AI자동화) ===");
  const res1 = await fetch("https://youtube-viral-studio.buylife.xyz/api/youtube/search-shorts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      keyword: "AI자동화",
      minViews: 10000,
      maxSubscribers: 100000,
      minViralScore: 1,
    }),
  });
  console.log("Status:", res1.status);
  const data1 = await res1.json();
  console.log("Viral shorts count:", data1.items?.length);
  console.log("Fallback applied:", data1.fallbackApplied);
  console.log("Fallback notice:", data1.fallbackNotice);
  if (data1.items?.length > 0) {
    console.log("First item:", {
      title: data1.items[0].title,
      channel: data1.items[0].channelTitle,
      subs: data1.items[0].subscriberCount,
      views: data1.items[0].viewCount,
      score: data1.items[0].viralScore,
    });
  }

  // 2. golden-channels (황금 채널 발굴) 테스트 - "AI"
  console.log("\n=== 2. Testing /api/youtube/golden-channels (AI) ===");
  const res2 = await fetch("https://youtube-viral-studio.buylife.xyz/api/youtube/golden-channels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      keyword: "AI",
      maxSubscribers: 100000,
      minGoldenScore: 1,
    }),
  });
  console.log("Status:", res2.status);
  const data2 = await res2.json();
  console.log("Golden channels count:", data2.items?.length);
  if (data2.items?.length > 0) {
    console.log("First channel:", {
      channel: data2.items[0].title,
      subs: data2.items[0].subscriberCount,
      avgViews: data2.items[0].avgViews,
      goldenScore: data2.items[0].goldenScore,
    });
  }

  // 3. trending-videos POST 테스트
  console.log("\n=== 3. Testing /api/youtube/trending (POST) ===");
  const res3 = await fetch("https://youtube-viral-studio.buylife.xyz/api/youtube/trending", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      type: "shorts",
      regionCode: "KR",
      maxResults: 30,
    }),
  });
  console.log("Status:", res3.status);
  const data3 = await res3.json();
  console.log("Trending items count:", data3.items?.length);
  if (data3.error) console.log("Error:", data3.error);
  if (data3.items?.length > 0) {
    console.log("First trending item:", {
      title: data3.items[0].title,
      views: data3.items[0].viewCount,
      vph: data3.items[0].vph,
      channel: data3.items[0].channelTitle,
    });
  }

  // 4. source-finder POST 테스트
  console.log("\n=== 4. Testing /api/youtube/source-finder ===");
  const res4 = await fetch("https://youtube-viral-studio.buylife.xyz/api/youtube/source-finder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      shortsUrl: "https://www.youtube.com/shorts/vZXT516-cAA",
    }),
  });
  console.log("Status:", res4.status);
  const data4 = await res4.json();
  console.log("Source finder result found:", !!data4.originalVideo);
  if (data4.error) console.log("Error:", data4.error);
  if (data4.originalVideo) {
    console.log("Original video:", {
      title: data4.originalVideo.title,
      url: data4.originalVideo.url,
      method: data4.matchMethod,
    });
  }

  // 5. analyze-script (AI 대본 분석) 테스트
  console.log("\n=== 5. Testing /api/youtube/analyze-script ===");
  const res5 = await fetch("https://youtube-viral-studio.buylife.xyz/api/youtube/analyze-script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      videoId: "vZXT516-cAA",
      title: "short ai tiktok video",
      channelTitle: "KAL",
    }),
  });
  console.log("Status:", res5.status);
  const data5 = await res5.json();
  if (data5.error) console.log("Error:", data5.error);
  if (data5.analysis) {
    console.log("AI Provider Used:", data5.analysis.providerUsed);
    console.log("Hook Title:", data5.analysis.hookTitle);
    console.log("Hook Score:", data5.analysis.hookScore);
    console.log("Viral Secret:", data5.analysis.viralSecret);
  }
}

testFull().catch(console.error);
