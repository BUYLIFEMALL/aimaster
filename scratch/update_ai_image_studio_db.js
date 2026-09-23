const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
let envText = fs.readFileSync(envPath, "utf8");

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : process.env[key];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("Updating program slug to 'ai-image-studio' and name to 'AI 이미지 스튜디오 (Image Studio)'...");

  const { data, error } = await supabase
    .from("programs")
    .update({
      name: "AI 이미지 스튜디오 (Image Studio)",
      slug: "ai-image-studio",
      short_desc: "OpenAI DALL-E 3, FLUX, Imagen 3 등 멀티 AI 모델로 맞춤 고품질 이미지를 생성합니다.",
      description: "한글 아이디어만으로 AI가 최적의 영문 프롬프트와 멀티 모델 옵션을 구성하여 OpenAI DALL-E 3, Google Imagen 3, FLUX, Stability AI 등 다양한 생성엔진으로 최상급 이미지를 즉시 생성하는 올인원 이미지 스튜디오입니다.",
      app_url: "https://ai-image-studio.vercel.app/dashboard"
    })
    .eq("slug", "image-automation")
    .select();

  if (error) {
    console.error("Failed to update program DB:", error);
  } else {
    console.log("Program updated successfully:", data);
  }
}

main().catch(console.error);
