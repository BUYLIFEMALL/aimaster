import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve("D:/Antigravity/AIMaster/style-dna-analyzer/.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim());

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await supabase
    .from("programs")
    .update({
      name: "이미지 스타일 분석기",
      short_desc: "이미지 한 장의 카메라·조명·색감·스타일을 분석해 그대로 재현하거나 변형할 수 있는 마스터 프롬프트로 만들어 주는 이미지 스타일 분석기",
      version: "v1.07",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "style-dna-analyzer")
    .select();

  if (error) {
    console.error("Update error:", error);
    process.exit(1);
  }

  console.log("Updated programs successfully:", data);
}

run();
