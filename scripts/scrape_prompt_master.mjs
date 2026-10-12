import fs from "node:fs";
import path from "node:path";

async function main() {
  const dir = "D:/Antigravity/AIMaster/scratch/prompt-master-scrape";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const targetUrl = "https://prompt-master-ten-flax.vercel.app/";
  console.log("Fetching HTML from", targetUrl);

  const res = await fetch(targetUrl);
  const html = await res.text();
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
  console.log("HTML saved. Length:", html.length);

  // Extract script and link tags
  const scriptRegex = /src=["']([^"']+\.js[^"']*)["']/g;
  let match;
  const jsFiles = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    jsFiles.push(match[1]);
  }

  // Also check for CSS
  const cssRegex = /href=["']([^"']+\.css[^"']*)["']/g;
  const cssFiles = [];
  while ((match = cssRegex.exec(html)) !== null) {
    cssFiles.push(match[1]);
  }

  console.log("Found JS:", jsFiles);
  console.log("Found CSS:", cssFiles);

  for (const js of jsFiles) {
    const fullUrl = js.startsWith("http") ? js : new URL(js, targetUrl).toString();
    console.log("Downloading JS:", fullUrl);
    try {
      const jRes = await fetch(fullUrl);
      const jText = await jRes.text();
      const filename = path.basename(new URL(fullUrl).pathname);
      fs.writeFileSync(path.join(dir, filename), jText, "utf8");
      console.log(`Saved ${filename} (${jText.length} bytes)`);
    } catch (e) {
      console.error("Failed downloading", fullUrl, e);
    }
  }

  for (const css of cssFiles) {
    const fullUrl = css.startsWith("http") ? css : new URL(css, targetUrl).toString();
    console.log("Downloading CSS:", fullUrl);
    try {
      const cRes = await fetch(fullUrl);
      const cText = await cRes.text();
      const filename = path.basename(new URL(fullUrl).pathname);
      fs.writeFileSync(path.join(dir, filename), cText, "utf8");
      console.log(`Saved ${filename} (${cText.length} bytes)`);
    } catch (e) {
      console.error("Failed downloading", fullUrl, e);
    }
  }
}

main().catch(console.error);
