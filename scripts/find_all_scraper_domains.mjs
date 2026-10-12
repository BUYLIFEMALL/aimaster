import fs from "node:fs";

const authPath = "C:/Users/Administrator/AppData/Roaming/xdg.data/com.vercel.cli/auth.json";
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const token = auth.token;

async function main() {
  // 1. check all projects in buylife team
  const teamId = "team_orq6xPe9P3c1uMQdKlJsQ6k9";
  const pRes = await fetch(`https://api.vercel.com/v9/projects?teamId=${teamId}&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pData = await pRes.json();
  console.log("=== Checking all projects in BUYLIFE team ===");
  for (const p of pData.projects || []) {
    if (p.name.includes("scraper") || p.name.includes("website") || p.name.includes("ghost")) {
      console.log(`Project: ${p.name} (${p.id})`);
      const dRes = await fetch(`https://api.vercel.com/v9/projects/${p.id}/domains?teamId=${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dData = await dRes.json();
      console.log("   Domains:", dData.domains?.map((d) => d.name));
    }
  }

  // 2. check personal account projects
  const pRes2 = await fetch(`https://api.vercel.com/v9/projects?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pData2 = await pRes2.json();
  console.log("\n=== Checking all projects in Personal account ===");
  for (const p of pData2.projects || []) {
    if (p.name.includes("scraper") || p.name.includes("website") || p.name.includes("ghost")) {
      console.log(`Personal Project: ${p.name} (${p.id})`);
      const dRes = await fetch(`https://api.vercel.com/v9/projects/${p.id}/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dData = await dRes.json();
      console.log("   Domains:", dData.domains?.map((d) => d.name));
    }
  }
}

main().catch(console.error);
