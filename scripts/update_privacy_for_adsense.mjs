import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function updatePrivacy() {
  const { data: doc, error: fetchErr } = await client
    .from("legal_documents")
    .select("*")
    .eq("slug", "privacy")
    .single();

  if (fetchErr || !doc) {
    console.error("Failed to fetch privacy document:", fetchErr);
    return;
  }

  let content = doc.content;

  if (content.includes("Google 애드센스") || content.includes("제13조")) {
    console.log("Privacy document already includes Google AdSense clauses.");
    return;
  }

  const adsenseClause = `

13. Google 애드센스 및 제3자 맞춤형 광고의 쿠키 수집·이용 안내
회사는 웹사이트 품질 유지 및 이용자 대상 유용한 정보 제공을 위해 Google 애드센스(Google AdSense) 등 제3자 광고 사업자의 온라인 맞춤형 광고 서비스를 이용할 수 있습니다.
- Google을 포함한 제3자 공급업체는 이용자가 본 사이트 또는 다른 웹사이트를 과거에 방문한 정보를 바탕으로 광고를 게재하기 위해 쿠키(Cookie)를 사용합니다.
- Google의 광고 쿠키 사용으로 인해 Google 및 파트너사는 이용자의 본 사이트 및 인터넷상의 다른 웹사이트 방문 기록을 기반으로 이용자에게 유용한 맞춤형 광고를 게재할 수 있습니다.
- 이용자는 언제든지 Google 광고 설정 페이지(https://www.google.com/settings/ads)를 방문하여 개인 맞춤 광고 게재를 거부(Opt-out)하거나 설정을 관리할 수 있습니다.
- 또한, 디지털 광고 연합의 소비자 옵트아웃 페이지(https://www.aboutads.info/choices/) 또는 네트워크 광고 이니셔티브(https://www.networkadvertising.org/choices/)를 통해 제3자 공급업체의 맞춤 광고 쿠키 사용을 선택적으로 해제할 수 있습니다.
- 이용자는 웹 브라우저의 옵션을 변경하여 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제약이 있을 수 있습니다.
(English) Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet. Users may opt out of personalized advertising by visiting Google Ads Settings (https://www.google.com/settings/ads) or www.aboutads.info.`;

  // 기존 12조 뒤에 삽입
  const updatedContent = content.replace(
    "본 방침은 2026년 9월 4일부터 시행되었으며",
    `${adsenseClause}\n\n본 방침은 2026년 9월 4일부터 시행되었으며`
  );

  const { error: updateErr } = await client
    .from("legal_documents")
    .update({
      content: updatedContent,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "privacy");

  if (updateErr) {
    console.error("Failed to update privacy document:", updateErr);
  } else {
    console.log("Successfully updated privacy document with Google AdSense requirements!");
  }
}

updatePrivacy().catch(console.error);
