import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function main() {
  const slug = "threads-easy-planner";
  console.log(`Checking existing program for slug: ${slug}...`);

  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  let programId = existing?.id;

  if (programId) {
    console.log(`Program already exists with ID: ${programId}. Updating...`);
    const { error } = await supabase
      .from("programs")
      .update({
        name: "Threads AI 기획 자동화",
        short_desc: "초보자도 버튼 하나로 피드를 멈추는 첫 문장 후킹부터 본문, 댓글 CTA, 후속 시리즈 아이디어까지 3초 만에 기획합니다.",
        description: "초보자도 쉽게 사용할 수 있는 스레드(Threads) AI 기획 프로그램 간단판입니다. 복잡한 프롬프트 작성이나 설정 없이, 주제를 입력하거나 '오늘 뭐 쓰지?' 버튼을 클릭하면 업종/타깃별 추천 주제 10개와 첫 문장 후킹, 가독성 최적화 본문, 댓글 유도 CTA, 후속 아이디어 5선까지 한 번에 완성합니다. 7종 다시 써줘(더 자극적으로, 더 자연스럽게 등) 원클릭 리라이팅 기능을 지원합니다.",
        category_id: "c188201d-6e04-4887-b4f9-e60936386bd1",
        is_active: true,
        version: "v1.18",
        badges: ["free", "new"],
        app_url: "https://threads-easy-planner.vercel.app",
        thumbnail_url: "https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/threads-easy-planner-thumbnail.jpg?v=1791076543712",
      })
      .eq("id", programId);
    if (error) throw error;
  } else {
    console.log("Creating new program...");
    const { data: inserted, error } = await supabase
      .from("programs")
      .insert({
        name: "Threads AI 기획 자동화",
        slug,
        short_desc: "초보자도 버튼 하나로 피드를 멈추는 첫 문장 후킹부터 본문, 댓글 CTA, 후속 시리즈 아이디어까지 3초 만에 기획합니다.",
        description: "초보자도 쉽게 사용할 수 있는 스레드(Threads) AI 기획 프로그램 간단판입니다. 복잡한 프롬프트 작성이나 설정 없이, 주제를 입력하거나 '오늘 뭐 쓰지?' 버튼을 클릭하면 업종/타깃별 추천 주제 10개와 첫 문장 후킹, 가독성 최적화 본문, 댓글 유도 CTA, 후속 아이디어 5선까지 한 번에 완성합니다. 7종 다시 써줘(더 자극적으로, 더 자연스럽게 등) 원클릭 리라이팅 기능을 지원합니다.",
        category_id: "c188201d-6e04-4887-b4f9-e60936386bd1",
        is_active: true,
        sort_order: 4,
        version: "v1.18",
        badges: ["free", "new"],
        app_url: "https://threads-easy-planner.vercel.app",
        thumbnail_url: "https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/threads-easy-planner-thumbnail.jpg?v=1791076543712",
      })
      .select("id")
      .single();

    if (error) throw error;
    programId = inserted.id;
    console.log(`Program created with ID: ${programId}`);
  }

  // 기본 3단계 요금제 등록 확인 (AGENTS.md §4 체크리스트)
  const { data: plans } = await supabase
    .from("pricing_plans")
    .select("id, billing_type")
    .eq("program_id", programId);

  const existingBillingTypes = new Set((plans ?? []).map((p) => p.billing_type));

  const defaultPlans = [
    { name: "1개월", billing_type: "monthly", price: 10000, original_price: 10000, is_active: true, sort_order: 1 },
    { name: "2개월", billing_type: "bimonthly", price: 20000, original_price: 20000, is_active: true, sort_order: 2 },
    { name: "3개월", billing_type: "quarterly", price: 30000, original_price: 30000, is_active: true, sort_order: 3 },
  ];

  for (const plan of defaultPlans) {
    if (!existingBillingTypes.has(plan.billing_type)) {
      console.log(`Adding pricing plan: ${plan.name}...`);
      await supabase.from("pricing_plans").insert({
        ...plan,
        program_id: programId,
      });
    }
  }

  console.log("Registration complete!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
