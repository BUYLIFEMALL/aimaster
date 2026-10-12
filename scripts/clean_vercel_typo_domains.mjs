import fs from "node:fs";

const authPath = "C:/Users/Administrator/AppData/Roaming/xdg.data/com.vercel.cli/auth.json";
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const token = auth.token;
const teamId = "team_orq6xPe9P3c1uMQdKlJsQ6k9";
const projectId = "prj_wmz2GZXutBmMwFH6BfqkecMLa0gV"; // website-scraper

const typoDomains = [
  "whbsite-scraper-buylife.vercel.app",
  "whbsite-scraper.vercel.app",
  "whbsite-scraper.buylife.xyz",
];

async function removeDomain(domain) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  console.log(`Deleted ${domain}:`, data);
}

async function main() {
  for (const d of typoDomains) {
    await removeDomain(d);
  }

  // Check remaining domains
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  console.log("\n=== Remaining domains on website-scraper ===");
  console.log(data.domains?.map((d) => d.name));
}

main().catch(console.error);
