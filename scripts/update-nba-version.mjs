import fs from "node:fs";

function envValue(name) {
  for (const file of ["naver-blog-allinone/.env.local", ".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const url = envValue("NEXT_PUBLIC_SUPABASE_URL");
const key = envValue("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
  console.error("Supabase URL or Key missing");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/programs?slug=eq.naver-blog-allinone`, {
  method: "PATCH",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    version: "v1.55",
    extension_version: "v1.55",
    updated_at: new Date().toISOString(),
  }),
});

if (!res.ok) {
  console.error(`DB Update Failed: HTTP ${res.status}`, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log("DB Update Success:", data[0]?.slug, "version:", data[0]?.version, "ext:", data[0]?.extension_version);
