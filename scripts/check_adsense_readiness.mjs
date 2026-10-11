import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("=== 1. LEGAL DOCUMENTS ===");
  const { data: legalDocs } = await client.from("legal_documents").select("slug, title, updated_at, content");
  for (const doc of legalDocs || []) {
    console.log(`- Slug: ${doc.slug}, Title: ${doc.title}, Length: ${doc.content?.length}`);
    if (doc.slug === "privacy") {
      console.log("--- PRIVACY CONTENT PREVIEW ---");
      console.log(doc.content);
      console.log("--------------------------------");
    }
  }

  console.log("\n=== 2. PLATFORM GUIDES ===");
  const { data: guides, error: gErr } = await client.from("platform_guides").select("id, category, title, is_active, sort_order");
  if (gErr) console.log("guides error:", gErr);
  console.log(`Total platform guides: ${guides?.length}`);
  for (const g of guides || []) {
    console.log(`- [${g.id}] [${g.category}] ${g.title} (active: ${g.is_active})`);
  }

  console.log("\n=== 3. PLATFORM GUIDE CATEGORIES ===");
  const { data: guideCats, error: catErr } = await client.from("platform_guide_categories").select("*");
  if (catErr) console.log("guideCats error:", catErr);
  console.log(guideCats);

  console.log("\n=== 4. PROGRAMS ===");
  const { data: programs, error: pErr } = await client.from("programs").select("id, slug, name, description, is_active, version");
  if (pErr) console.log("programs error:", pErr);
  console.log(`Total programs: ${programs?.length}`);
  for (const p of programs || []) {
    console.log(`- ${p.name} (${p.slug}) [v: ${p.version}] - desc length: ${p.description?.length}`);
  }
}

check().catch(console.error);
