const { Client } = require("d:/Antigravity/AIMaster/threads/node_modules/pg");

const regions = [
  "aws-0-ap-northeast-2",
  "aws-0-ap-northeast-1",
  "aws-0-us-east-1",
  "aws-0-us-west-1",
  "aws-0-eu-central-1"
];

async function main() {
  for (const reg of regions) {
    const pwd = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
    const connStr = `postgres://postgres.esgxyikcnnvmlhygjkth:${pwd}@${reg}.pooler.supabase.com:6543/postgres`;
    console.log(`Testing region ${reg}...`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`SUCCESS! Connected to Postgres on region ${reg}!`);

      const ddl = `
      CREATE TABLE IF NOT EXISTS public.user_image_generations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          prompt TEXT NOT NULL,
          enhanced_prompt TEXT,
          options JSONB DEFAULT '{}'::jsonb,
          image_url TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE public.user_image_generations ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can view own image generations" ON public.user_image_generations;
      CREATE POLICY "Users can view own image generations" ON public.user_image_generations FOR SELECT USING (auth.uid() = user_id);
      DROP POLICY IF EXISTS "Users can insert own image generations" ON public.user_image_generations;
      CREATE POLICY "Users can insert own image generations" ON public.user_image_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
      DROP POLICY IF EXISTS "Users can delete own image generations" ON public.user_image_generations;
      CREATE POLICY "Users can delete own image generations" ON public.user_image_generations FOR DELETE USING (auth.uid() = user_id);
      CREATE INDEX IF NOT EXISTS idx_user_image_generations_user_created ON public.user_image_generations(user_id, created_at DESC);
      `;

      await client.query(ddl);
      console.log("SUCCESS! Created user_image_generations table and RLS policies!");
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed region ${reg}: ${err.message}`);
    }
  }
}

main().catch(console.error);
