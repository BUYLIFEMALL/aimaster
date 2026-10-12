import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = "D:/Antigravity/AIMaster/style-dna-analyzer/.env.local";
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const newShortDesc = "이미지 한 장으로 카메라·조명·색상 팔레트·화풍을 정밀 분석하여, 원본 스타일을 그대로 복제하거나 원하는 대로 변형할 수 있는 마스터 프롬프트 추출기";

const newDescription = `이미지 한 장을 올리면 AI가 카메라(앵글·샷·렌즈·심도)와 조명 환경(시간대·방향·대비·그림자), 실제 미학적 컬러 팔레트, 스타일 핵심 요소를 정밀 분석하여 영어·한국어 마스터 프롬프트를 생성합니다.

「스타일 복제」 모드는 원본의 구도와 화풍을 그대로 정밀 재현하고, 「스타일 변형」 모드는 강도(0~100%)와 추가 분석 지침에 따라 독창적인 스타일로 재해석합니다. [첨부 이미지] 참조 모드를 활용하면 원본을 참조 파일로 함께 넣어 완벽한 스타일 전이(Style Transfer)를 구현할 수 있습니다.

하단 실시간 추론 인터페이스에서 프롬프트를 즉시 미세 보정할 수 있으며, 3단계 결과 테스트에서 원하는 피사체를 넣어 실제 AI 이미지를 생성하고 원본과의 색감 일치율(%)까지 실측 비교할 수 있습니다. 모든 분석 결과는 보관함에 자동 저장되며, 모든 AI 호출은 회원 본인의 Gemini·OpenAI·Claude API 키로 안전하게 동작합니다.`;

async function run() {
  const { data, error } = await supabase
    .from("programs")
    .update({
      short_desc: newShortDesc,
      description: newDescription,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "style-dna-analyzer")
    .select("id, name, slug, short_desc, description, version");

  if (error) {
    console.error("Update error:", error);
    process.exit(1);
  }

  console.log("Updated programs table successfully:", JSON.stringify(data, null, 2));
}

run();
