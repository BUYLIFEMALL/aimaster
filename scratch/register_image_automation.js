const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
let envText = "";
if (fs.existsSync(envPath)) {
  envText = fs.readFileSync(envPath, "utf8");
}

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : process.env[key];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("Checking categories and grades...");
  const { data: categories, error: catError } = await supabase.from("categories").select("*");
  if (catError) console.error("Categories error:", catError);
  console.log("Categories:", categories);

  const { data: grades, error: gradeError } = await supabase.from("member_grades").select("*").order("sort_order", { ascending: true });
  if (gradeError) console.error("Grades error:", gradeError);
  console.log("Grades:", grades);

  // Find '유틸리티' or '마케팅' category or fallback to first
  const targetCategory = categories.find(c => c.name.includes("유틸리티") || c.name.includes("마케팅")) || categories[0];
  const basicGrade = grades.find(g => g.slug === "basic" || g.name.includes("일반")) || grades[0];

  console.log("Target Category:", targetCategory);
  console.log("Basic Grade:", basicGrade);

  // Check if program already exists
  const { data: existingProg } = await supabase.from("programs").select("*").eq("slug", "image-automation").maybeSingle();

  let programId = existingProg?.id;

  if (!existingProg) {
    console.log("Inserting new program 'image-automation'...");
    const { data: maxSort } = await supabase.from("programs").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    const nextSort = (maxSort && maxSort[0]?.sort_order ? maxSort[0].sort_order : 0) + 1;

    const { data: newProg, error: insertError } = await supabase.from("programs").insert({
      category_id: targetCategory.id,
      required_grade_id: basicGrade.id,
      name: "이미지 자동화",
      slug: "image-automation",
      short_desc: "OpenAI, FLUX, Imagen 3 등 다양한 AI 모델로 고품질 이미지를 자동 생성합니다.",
      description: "한글 입력만으로 AI가 최적의 영문 프롬프트와 옵션을 구성하여 OpenAI DALL-E 3, Google Imagen 3, FLUX, Stability AI 등 다양한 이미지 생성 플랫폼으로 고품질 이미지를 손쉽게 생성합니다.",
      is_active: true,
      badges: ["new"],
      sort_order: nextSort,
      app_url: "https://image-automation.vercel.app/dashboard"
    }).select().single();

    if (insertError) {
      console.error("Failed to insert program:", insertError);
      process.exit(1);
    }

    programId = newProg.id;
    console.log("Inserted program ID:", programId);

    // Insert 3 pricing plans
    const { error: plansError } = await supabase.from("pricing_plans").insert([
      { program_id: programId, name: "1개월", billing_type: "monthly", price: 10000, original_price: 10000, is_active: true, sort_order: 0 },
      { program_id: programId, name: "2개월", billing_type: "bimonthly", price: 20000, original_price: 20000, is_active: true, sort_order: 1 },
      { program_id: programId, name: "3개월", billing_type: "quarterly", price: 30000, original_price: 30000, is_active: true, sort_order: 2 }
    ]);

    if (plansError) {
      console.error("Failed to insert pricing plans:", plansError);
    } else {
      console.log("Inserted default 3-tier pricing plans.");
    }
  } else {
    console.log("Program 'image-automation' already exists with ID:", programId);
  }
}

main().catch(console.error);
