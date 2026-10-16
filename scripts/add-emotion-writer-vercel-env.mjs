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
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", val: (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) },
  { key: "SUPABASE_SERVICE_ROLE_KEY", val: (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()) },
  { key: "NEXT_PUBLIC_MAIN_SITE_URL", val: "https://buylife.xyz" },
];

for (const t of targets) {
  if (!t.val) {
    console.error(`Skipping ${t.key}: value is empty`);
    continue;
  }
  console.log(`Adding ${t.key} to Vercel production for emotion-writer...`);
  try {
    execSync(`vercel env add ${t.key} production --force`, {
      cwd: "D:/Antigravity/AIMaster/emotion-writer",
      input: t.val,
      stdio: ["pipe", "inherit", "inherit"],
    });
    console.log(`Successfully added ${t.key}`);
  } catch (err) {
    console.error(`Failed to add ${t.key}:`, err.message);
  }
}
