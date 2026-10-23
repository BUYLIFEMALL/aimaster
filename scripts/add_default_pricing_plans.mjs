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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

const DEFAULT_PLANS = [
  { name: "1개월", billing_type: "monthly", price: 10000, original_price: 10000, is_active: true, sort_order: 0 },
  { name: "2개월", billing_type: "bimonthly", price: 20000, original_price: 20000, is_active: true, sort_order: 1 },
  { name: "3개월", billing_type: "quarterly", price: 30000, original_price: 30000, is_active: true, sort_order: 2 },
];

async function addDefaultPlans(programId) {
  const { data: existingPlans } = await supabase
    .from("pricing_plans")
    .select("id")
    .eq("program_id", programId);

  if (existingPlans && existingPlans.length > 0) {
    console.log(`Program ${programId} already has ${existingPlans.length} plans.`);
    return;
  }

  const payload = DEFAULT_PLANS.map((p) => ({
    ...p,
    program_id: programId,
  }));

  const { data, error } = await supabase
    .from("pricing_plans")
    .insert(payload)
    .select();

  if (error) {
    console.error(`Error inserting plans for ${programId}:`, error);
  } else {
    console.log(`Successfully inserted ${data.length} default plans for ${programId}:`, data);
  }
}

async function run() {
  const targetIds = [
    "84a87995-28c7-42bc-9b6a-c25c42dd90b4", // Youtube Playlist 자동화
    "b57915bb-4446-40e5-b3e9-9e4d902c027f", // AI 인플루언서 자동화
  ];
  for (const id of targetIds) {
    await addDefaultPlans(id);
  }
}

run();
