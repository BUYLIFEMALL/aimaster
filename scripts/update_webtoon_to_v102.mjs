import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("programs")
    .update({
      name: "AI 웹툰 자동화",
      version: "v1.02",
      app_url: "https://ai-webtoon-automation.buylife.xyz",
      short_desc: "시놉시스 기획부터 캐릭터 일관성 시트, 컷별 콘티 생성, 세로 스크롤 완성 원고 렌더링 및 롱스크롤 이어붙이기(JPG)까지 한 곳에서 완성하는 AI 웹툰 제작 자동화 프로그램",
    })
    .eq("slug", "ai-webtoon-studio")
    .select();

  if (error) {
    console.error("UPDATE ERROR:", error);
    process.exit(1);
  }

  console.log("UPDATE SUCCESS:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
