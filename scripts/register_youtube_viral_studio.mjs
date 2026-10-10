import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required in environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log("1. Finding or creating category '영상/유튜브'...");
  let { data: catData, error: catErr } = await supabase
    .from("categories")
    .select("*")
    .or("name.eq.영상/유튜브,name.eq.유튜브,name.eq.영상,name.eq.멀티미디어")
    .limit(1)
    .maybeSingle();

  if (!catData) {
    const { data: newCat, error: insertCatErr } = await supabase
      .from("categories")
      .insert({
        name: "영상/유튜브",
        slug: "youtube",
        sort_order: 10,
      })
      .select()
      .single();

    if (insertCatErr) {
      console.error("Error creating category:", insertCatErr);
      process.exit(1);
    }
    catData = newCat;
  }
  console.log("Category ID:", catData.id, "(", catData.name, ")");

  console.log("2. Upserting 'YouTube Viral Studio (골든 파인더)' program...");
  const programPayload = {
    category_id: catData.id,
    name: "YouTube Viral Studio (골든 파인더)",
    slug: "youtube-viral-studio",
    short_desc: "소형 채널 떡상 쇼츠 발굴, 황금 채널 스크리닝, 실시간 VPH 급상승 영상 랭킹 및 롱폼 원본 역추적",
    description: "구독자 1만명 이하 소형 채널에서 터진 떡상 쇼츠 발굴, 영상당 수십만 회 급성장 황금 채널 스크리닝, 시간당 조회수 속도(VPH) 랭킹 및 쇼츠 원본 역추적까지 지원하는 유튜브 벤치마킹 전문 스튜디오입니다.",
    version: "v1.01",
    is_active: true,
    badges: ["free", "new"],
    app_url: "https://youtube-viral-studio.vercel.app",
    thumbnail_url: "https://www.buylife.xyz/thumbnails/youtube-viral-studio.png",
  };

  const { data: existingProg } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", "youtube-viral-studio")
    .maybeSingle();

  let programId;
  if (existingProg) {
    const { data: updatedProg, error: updateErr } = await supabase
      .from("programs")
      .update(programPayload)
      .eq("id", existingProg.id)
      .select()
      .single();
    if (updateErr) {
      console.error("Error updating program:", updateErr);
      process.exit(1);
    }
    programId = updatedProg.id;
    console.log("Updated program:", programId);
  } else {
    const { data: newProg, error: insertProgErr } = await supabase
      .from("programs")
      .insert(programPayload)
      .select()
      .single();
    if (insertProgErr) {
      console.error("Error inserting program:", insertProgErr);
      process.exit(1);
    }
    programId = newProg.id;
    console.log("Inserted program:", programId);
  }

  console.log("3. Checking pricing plans...");
  const { data: existingPlans } = await supabase
    .from("pricing_plans")
    .select("id")
    .eq("program_id", programId);

  if (!existingPlans || existingPlans.length === 0) {
    console.log("Creating default 3-tier pricing plans...");
    const plansPayload = [
      {
        program_id: programId,
        name: "1개월",
        billing_type: "monthly",
        price: 10000,
        original_price: 10000,
        is_active: true,
        sort_order: 1,
      },
      {
        program_id: programId,
        name: "2개월",
        billing_type: "bimonthly",
        price: 20000,
        original_price: 20000,
        is_active: true,
        sort_order: 2,
      },
      {
        program_id: programId,
        name: "3개월",
        billing_type: "quarterly",
        price: 30000,
        original_price: 30000,
        is_active: true,
        sort_order: 3,
      },
    ];

    const { error: plansErr } = await supabase.from("pricing_plans").insert(plansPayload);
    if (plansErr) {
      console.error("Error inserting pricing plans:", plansErr);
    } else {
      console.log("Created 3-tier pricing plans successfully.");
    }
  } else {
    console.log("Pricing plans already exist:", existingPlans.length, "plans.");
  }

  console.log("SUCCESS! Registration completed perfectly.");
}

run().catch(console.error);
