import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const slug = "vinyl-lp-studio";
  console.log(`Checking if program ${slug} exists in DB...`);

  // 샘플 프로그램 1개로 컬럼 목록 확인
  const { data: sample } = await supabase.from("programs").select("*").limit(1).single();
  console.log("Programs table columns:", Object.keys(sample || {}));

  // 음악 카테고리 ID 찾기
  let categoryId = null;
  const { data: cats } = await supabase.from("categories").select("*");
  console.log("Categories:", cats?.map(c => ({ id: c.id, name: c.name })));
  const musicCat = cats?.find(c => c.name.includes("음악") || c.name.toLowerCase().includes("music"));
  if (musicCat) categoryId = musicCat.id;

  const { data: existing } = await supabase
    .from("programs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const programData = {
    slug,
    name: "AI 바이닐 스튜디오",
    description: "Google Gemini AI 기반 바이닐 LP & CD 앨범 목업 제작 및 60fps MP4/GIF 회전 애니메이션 스튜디오",
    version: "v1.01",
    badges: ["free", "new"],
    app_url: "https://vinyl-lp.buylife.xyz",
    is_active: true,
  };
  if (categoryId && sample && "category_id" in sample) {
    programData.category_id = categoryId;
  }

  if (existing) {
    console.log("Program already exists:", existing.slug, existing.version);
    const { data: updated, error: updateErr } = await supabase
      .from("programs")
      .update(programData)
      .eq("slug", slug)
      .select()
      .single();

    if (updateErr) {
      console.error("Error updating program:", updateErr);
      process.exit(1);
    }
    console.log("Updated successfully:", updated.slug, updated.version);
    return;
  }

  console.log("Registering new program:", slug);
  const { data: inserted, error: insertErr } = await supabase
    .from("programs")
    .insert({
      ...programData,
      sort_order: 35,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Error inserting program:", insertErr);
    process.exit(1);
  }

  console.log("Registered new program successfully:", inserted.slug, inserted.version);

  // 기본 pricing_plans 등록 체크 (체크리스트 준수)
  const { data: existingPlans } = await supabase
    .from("pricing_plans")
    .select("id")
    .eq("program_id", inserted.id);

  if (!existingPlans || existingPlans.length === 0) {
    console.log("Inserting default pricing plans...");
    await supabase.from("pricing_plans").insert([
      {
        program_id: inserted.id,
        name: "1개월",
        billing_type: "monthly",
        price: 10000,
        original_price: 10000,
        is_active: true,
      },
      {
        program_id: inserted.id,
        name: "2개월",
        billing_type: "bimonthly",
        price: 20000,
        original_price: 20000,
        is_active: true,
      },
      {
        program_id: inserted.id,
        name: "3개월",
        billing_type: "quarterly",
        price: 30000,
        original_price: 30000,
        is_active: true,
      },
    ]);
    console.log("Default pricing plans inserted.");
  }
}

main();
