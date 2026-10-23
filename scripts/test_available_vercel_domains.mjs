import fs from "node:fs";

const authPath = "C:/Users/Administrator/AppData/Roaming/xdg.data/com.vercel.cli/auth.json";
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const token = auth.token;
const teamId = "team_orq6xPe9P3c1uMQdKlJsQ6k9";
const projectId = "prj_wmz2GZXutBmMwFH6BfqkecMLa0gV";

const candidates = [
  "website-scraper.vercel.app",
  "websitescraper.vercel.app",
  "website-scraper-ai.vercel.app",
  "website-scraper-app.vercel.app",
  "website-scraper-buylife.vercel.app",
];

async function check(name) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains?teamId=${teamId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  console.log(`Checking ${name}:`, data.error ? data.error.message : "SUCCESS!");
}

async function main() {
  for (const c of candidates) {
    if (c === "website-scraper-buylife.vercel.app") continue; // already added
    await check(c);
  }
}

main().catch(console.error);
