import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// .env.local 수동 파싱
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
  const programId = "7d3895af-f1b8-4c24-9a62-cfebf7bd9676";
  console.log("조회 중인 프로그램 ID:", programId);

  const { data: program } = await supabase.from("programs").select("*").eq("id", programId).single();
  console.log("프로그램 이름:", program?.name);

  const { data: plans } = await supabase.from("pricing_plans").select("*").eq("program_id", programId).order("sort_order");
  console.log("기존 등록된 플랜들:", plans);

  // 기본 표준 가격 플랜: 1개월: 10,000원, 2개월: 20,000원, 3개월: 30,000원
  // 기존 플랜을 표준으로 업데이트
  if (plans && plans.length > 0) {
    for (const plan of plans) {
      if (plan.billing_type === "monthly") {
        await supabase.from("pricing_plans").update({
          name: "1개월",
          price: 10000,
          original_price: 10000,
          sort_order: 1,
        }).eq("id", plan.id);
      } else if (plan.billing_type === "bimonthly") {
        await supabase.from("pricing_plans").update({
          name: "2개월",
          price: 20000,
          original_price: 20000,
          sort_order: 2,
        }).eq("id", plan.id);
      } else if (plan.billing_type === "quarterly") {
        await supabase.from("pricing_plans").update({
          name: "3개월",
          price: 30000,
          original_price: 30000,
          sort_order: 3,
        }).eq("id", plan.id);
      }
    }
    console.log("표준 기본 가격 플랜(1만/2만/3만)으로 업데이트 완료!");
  }

  const { data: updatedPlans } = await supabase.from("pricing_plans").select("*").eq("program_id", programId).order("sort_order");
  console.log("업데이트 후 플랜들:", updatedPlans);
}

main().catch(console.error);
