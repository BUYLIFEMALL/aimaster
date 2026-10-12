import fs from "node:fs";

const authPath = "C:/Users/Administrator/AppData/Roaming/xdg.data/com.vercel.cli/auth.json";
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const token = auth.token;

async function main() {
  const teamId = "team_orq6xPe9P3c1uMQdKlJsQ6k9";
  const projectId = "prj_wmz2GZXutBmMwFH6BfqkecMLa0gV"; // website-scraper

  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  console.log("=== Domains on project website-scraper ===");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
