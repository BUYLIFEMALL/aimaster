// 카탈로그 썸네일 모아 보기(2026-10-20) — programs.thumbnail_url 전체를 한 장에 20개씩(5×4) 번호·slug와 함께 모아
// 실사가 아닌(3D·일러스트·만화) 썸네일을 한눈에 찾기 위한 점검용 이미지. 규칙: docs/PLATFORM_PATTERNS.md §13(카탈로그 썸네일은 실사).
// 결과: scripts/.tmp-thumbnail-sheet-01.png … + scripts/.tmp-thumbnail-sheet.json(번호·slug·이름·주소 목록). DB는 읽기만 한다.
//
// Usage: node scripts/thumbnail-contact-sheet.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadSharp } from "./thumbnail-zoom-tiles.mjs";

function loadEnvLocal(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i !== -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnvLocal(new URL("../.env.local", import.meta.url));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim());
const sharp = await loadSharp();

const { data, error } = await supabase.from("programs").select("slug, name, thumbnail_url").not("thumbnail_url", "is", null).order("slug");
if (error) throw new Error(error.message);

const W = 320, H = 180, LABEL = 26, COLS = 5, ROWS = 4, PER = COLS * ROWS;
const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const list = data.map((p, i) => ({ no: i + 1, slug: p.slug, name: p.name, url: p.thumbnail_url }));

for (let sheet = 0; sheet * PER < list.length; sheet++) {
  const items = list.slice(sheet * PER, sheet * PER + PER);
  const composites = [];
  for (const [k, item] of items.entries()) {
    const x = (k % COLS) * W, y = Math.floor(k / COLS) * (H + LABEL);
    try {
      const buf = Buffer.from(await (await fetch(item.url)).arrayBuffer());
      composites.push({ input: await sharp(buf).resize(W, H, { fit: "cover" }).png().toBuffer(), left: x, top: y });
    } catch {
      item.error = "이미지를 받지 못함";
    }
    const label = `<svg width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="18" font-family="Arial" font-size="14" fill="#fff">${item.no}. ${escape(item.slug)}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: x, top: y + H });
  }
  const out = fileURLToPath(new URL(`./.tmp-thumbnail-sheet-${String(sheet + 1).padStart(2, "0")}.png`, import.meta.url));
  await sharp({ create: { width: W * COLS, height: (H + LABEL) * ROWS, channels: 3, background: "#222" } }).composite(composites).png().toFile(out);
  console.log("저장:", out);
}
writeFileSync(fileURLToPath(new URL("./.tmp-thumbnail-sheet.json", import.meta.url)), JSON.stringify(list, null, 1));
console.log(`프로그램 ${list.length}개, 받지 못한 이미지 ${list.filter((x) => x.error).length}개`);
