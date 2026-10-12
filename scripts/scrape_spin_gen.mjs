import fs from "fs";
import path from "path";

async function main() {
  const targetUrl = "https://spin-gen.vercel.app/";
  console.log(`Fetching HTML from ${targetUrl}...`);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      }
    });

    const html = await res.text();
    console.log(`HTML length: ${html.length}`);

    // 저장 디렉토리 생성
    const outDir = path.resolve("scratch/spin_gen");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
    console.log(`Saved index.html to ${outDir}`);

    // 스크립트 태그 추출
    const scriptSrcs = [];
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      scriptSrcs.push(match[1]);
    }

    // link 태그 (CSS 등)
    const linkHrefs = [];
    const linkRegex = /<link[^>]+href=["']([^"']+)["']/gi;
    while ((match = linkRegex.exec(html)) !== null) {
      linkHrefs.push(match[1]);
    }

    console.log("Found Scripts:", scriptSrcs);
    console.log("Found Links:", linkHrefs);

    // 번들 JS 파일들 다운로드 및 저장
    for (const src of scriptSrcs) {
      const fullUrl = src.startsWith("http") ? src : new URL(src, targetUrl).href;
      console.log(`Fetching script: ${fullUrl}...`);
      try {
        const sRes = await fetch(fullUrl);
        const sText = await sRes.text();
        const fname = path.basename(new URL(fullUrl).pathname) || "bundle.js";
        fs.writeFileSync(path.join(outDir, fname), sText, "utf8");
        console.log(`Saved ${fname} (${sText.length} bytes)`);
      } catch (err) {
        console.error(`Failed to fetch script ${fullUrl}:`, err);
      }
    }

  } catch (err) {
    console.error("Error scraping:", err);
  }
}

main();
