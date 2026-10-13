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
  const updatePayload = {
    name: "AI 슬라이드 자동화",
    version: "v1.02",
    short_desc: "22개 전문 슬라이드 스키마 기반 IR 피치덱·사업계획서·C-Suite 보고서 원클릭 자동 생성 및 16:9 와이드 PPTX 다운로드",
    description: "22개 전문 슬라이드 스키마와 3대 기획 프레임워크(표준, 확장판, C-Suite 보고 형식)를 탑재한 프레젠테이션 자동화 솔루션입니다. PDF, DOCX, XLSX, TXT 등 실무 문서를 파싱하여 슬라이드별 핵심 지표와 전략을 자동 구성하며, 브라우저에서 직접 16:9 와이드스크린 파워포인트(PPTX) 파일로 즉시 다운로드하거나 16:9 반응형 슬라이드쇼로 미리 볼 수 있습니다. 모든 기능은 회원 본인의 Google Gemini API 키로 안전하게 구동됩니다.",
  };

  const { data, error } = await supabase
    .from("programs")
    .update(updatePayload)
    .eq("slug", "ai-slide-builder")
    .select()
    .single();

  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Successfully updated programs table:", data.name, data.version);
  }
}

main().catch(console.error);
