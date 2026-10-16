import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()), {
  auth: { persistSession: false },
});

async function main() {
  console.log("1. Finding category and grade...");
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug");

  const { data: grades } = await supabase
    .from("member_grades")
    .select("id, name, slug");

  // SNS/콘텐츠 또는 첫 번째 카테고리
  const contentCat = categories?.find((c) => c.slug === "content" || c.slug === "sns" || c.slug === "image") || categories?.[0];
  const basicGrade = grades?.find((g) => g.slug === "basic") || grades?.[0];

  const { data: maxSortData } = await supabase
    .from("programs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = (maxSortData?.[0]?.sort_order || 0) + 1;

  console.log("2. Upserting ai-webtoon-studio program...");
  const programPayload = {
    slug: "ai-webtoon-studio",
    name: "AI 웹툰 스튜디오 PRO",
    short_desc: "시놉시스 기획부터 캐릭터 일관성 시트, 컷별 콘티 생성, 세로 스크롤 완성 원고 렌더링 및 롱스크롤 이어붙이기(JPG)까지 올인원 웹툰 제작 솔루션",
    description: "생성형 AI로 웹툰 기획과 제작을 한 곳에서 완성하는 전문 스튜디오입니다. 5대 웹툰 아트 스타일(현대 한국 웹툰 풍, 소년 만화 풍, 로맨스 순정 풍, SD/캐주얼 풍, 미국 코믹스 풍), 캐릭터 일관성 턴어라운드 시트 생성, 컷별 연출·지문·대사 콘티 자동 분할, 실제 네이버/카카오 웹툰 뷰어 경험의 세로 스크롤 뷰 및 HTML5 캔버스 기반 고해상도 단일 롱 세로 이미지(JPG) 자동 합성 다운로드를 지원합니다.",
    app_url: "https://ai-webtoon-studio.buylife.xyz",
    version: "v1.01",
    is_active: true,
    badges: ["new", "free"],
    category_id: contentCat?.id,
    required_grade_id: basicGrade?.id,
    sort_order: nextSortOrder,
  };

  const { data: upsertedProgram, error: programErr } = await supabase
    .from("programs")
    .upsert(programPayload, { onConflict: "slug" })
    .select()
    .single();

  if (programErr) {
    console.error("Program upsert error:", programErr);
    process.exit(1);
  }
  console.log("Program upserted successfully:", upsertedProgram.id, upsertedProgram.slug, upsertedProgram.name);

  // Pricing plans
  const { data: existingPlans } = await supabase
    .from("pricing_plans")
    .select("id")
    .eq("program_id", upsertedProgram.id);

  if (!existingPlans || existingPlans.length === 0) {
    const plansPayload = [
      {
        program_id: upsertedProgram.id,
        name: "1개월",
        billing_type: "monthly",
        price: 10000,
        original_price: 10000,
        is_active: true,
        sort_order: 1,
      },
      {
        program_id: upsertedProgram.id,
        name: "2개월",
        billing_type: "bimonthly",
        price: 20000,
        original_price: 20000,
        is_active: true,
        sort_order: 2,
      },
      {
        program_id: upsertedProgram.id,
        name: "3개월",
        billing_type: "quarterly",
        price: 30000,
        original_price: 30000,
        is_active: true,
        sort_order: 3,
      },
    ];
    await supabase.from("pricing_plans").insert(plansPayload);
    console.log("Pricing plans created successfully!");
  }

  console.log("Done!");
}

main().catch(console.error);
