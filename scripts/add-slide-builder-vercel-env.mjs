import fs from "node:fs";
import { execSync } from "node:child_process";

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

const targets = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", val: env.NEXT_PUBLIC_SUPABASE_URL },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", val: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  { key: "SUPABASE_SERVICE_ROLE_KEY", val: env.SUPABASE_SERVICE_ROLE_KEY },
  { key: "NEXT_PUBLIC_MAIN_SITE_URL", val: "https://buylife.xyz" },
];

for (const t of targets) {
  if (!t.val) {
    console.error(`Skipping ${t.key}: value is empty`);
    continue;
  }
  for (const envType of ["production", "development", "preview"]) {
    console.log(`Adding ${t.key} to Vercel ${envType}...`);
    try {
      execSync(`vercel env add ${t.key} ${envType} --force`, {
        cwd: "D:/Antigravity/AIMaster/ai-slide-builder",
        input: t.val,
        stdio: ["pipe", "inherit", "inherit"],
      });
      console.log(`Successfully added ${t.key} to ${envType}`);
    } catch (err) {
      console.error(`Failed to add ${t.key} to ${envType}:`, err.message);
    }
  }
}
