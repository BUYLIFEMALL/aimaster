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
  console.log("Testing RPC functions...");
  const sql = `
create table if not exists user_image_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt text not null,
  enhanced_prompt text,
  options jsonb not null default '{}'::jsonb,
  image_url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);
alter table user_image_generations enable row level security;
create policy "Users can view their own image generations" on user_image_generations for select using (auth.uid() = user_id);
create policy "Users can insert their own image generations" on user_image_generations for insert with check (auth.uid() = user_id);
create policy "Users can delete their own image generations" on user_image_generations for delete using (auth.uid() = user_id);
create index if not exists idx_user_image_generations_user_id on user_image_generations(user_id);
create index if not exists idx_user_image_generations_created_at on user_image_generations(created_at desc);
`;

  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  console.log("RPC exec_sql result:", { data, error });
}

main().catch(console.error);
