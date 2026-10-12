import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const ecommerceCatId = "3f365685-a7d7-4372-817a-c38217239592"; // 이커머스
  const { error } = await supabase
    .from("programs")
    .update({ category_id: ecommerceCatId, updated_at: new Date().toISOString() })
    .eq("slug", "detail-page-12p");

  if (error) {
    console.error("카테고리 업데이트 실패:", error);
  } else {
    console.log("✓ AI 12단 상세페이지 자동화 카테고리를 '이커머스'로 변경 완료!");
  }
}

run();
