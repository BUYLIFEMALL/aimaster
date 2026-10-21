#!/usr/bin/env node
// 프로그램 비교 분석 1단계 자료 수집(읽기 전용) — 기준 매뉴얼: docs/PROGRAM_COMPARISON_ANALYSIS_GUIDE.md
// 사용: node scripts/analyze-category.mjs <카테고리 slug 또는 이름>      예) node scripts/analyze-category.mjs "scraping&plan"
//       node scripts/analyze-category.mjs --slugs ai-prompt-studio,prompt-template-studio   (카테고리 대신 프로그램을 직접 지정)
// 하는 일: ① 운영 DB(ref esgxyikcnnvmlhygjkth)에서 프로그램 목록·버전·배지·권한 회원 수·사용 기록 수를 읽고
//          ② 각 프로그램 폴더 코드에서 규모·API 수·자체 DB 표·브라우저 저장(localStorage/IndexedDB)·AI 모델·주요 라이브러리·본인 키 사용을 센다.
// DB에는 읽기(GET)만 하고 아무것도 쓰지 않는다. 서비스 키는 루트 .env.local에서 읽고 화면에 출력하지 않는다.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const env = Object.fromEntries(fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = (env.SUPABASE_SECRET_KEY || "").trim() || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_?.includes("esgxyikcnnvmlhygjkth")) { console.error("운영 DB 주소가 아닙니다 — 중단"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" };
const get = async (q) => { const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: H }); return { rows: await r.json(), total: Number((r.headers.get("content-range") || "/0").split("/")[1]) || 0 }; };

const COMMON_TABLES = new Set(["profiles", "programs", "subscriptions", "user_program_access", "user_api_keys", "usage_logs", "grade_program_access", "member_grades", "member_platform_accounts", "integration_catalog"]);
const LIBS = ["pptxgenjs", "mammoth", "pdfjs-dist", "xlsx", "exceljs", "jszip", "cheerio", "playwright", "puppeteer", "docx", "html2canvas", "marked", "react-markdown", "@tiptap/react", "fabric", "konva", "turndown", "mp4-muxer", "remotion", "sharp"];
const SKIP = new Set(["node_modules", ".next", ".vercel", ".git", "dist", "out", "public"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** programs.slug → 코드 폴더(PROGRAM_SLUG·THIS_PROGRAM_SLUG 선언으로 찾음) */
function findFolder(slug) {
  const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && !SKIP.has(d.name) && d.name !== "labs");
  // PROGRAM_SLUG·THIS_PROGRAM_SLUG·APP_SLUG 등 이름이 SLUG로 끝나는 상수
  const re = new RegExp(`[A-Z_]*SLUG\\s*=\\s*["'\`]${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`);
  for (const d of dirs) {
    for (const sub of ["", "webapp", "web"]) {
      const base = path.join(root, d.name, sub);
      for (const f of ["src/lib/version.ts", "lib/version.ts", "src/lib/access.ts", "lib/access.ts", "utils/access.ts", "src/lib/programAccess.ts", "lib/programAccess.ts"]) {
        const p = path.join(base, f);
        if (fs.existsSync(p) && re.test(fs.readFileSync(p, "utf8"))) return path.relative(root, base).replace(/\\/g, "/") || d.name;
      }
    }
  }
  return dirs.some((d) => d.name === slug) ? slug : null; // 선언이 없으면 폴더 이름이 slug와 같은 곳
}

function codeFacts(folder) {
  const base = path.join(root, folder);
  const files = walk(fs.existsSync(path.join(base, "src")) ? path.join(base, "src") : base);
  let lines = 0, api = 0, ls = 0, idb = 0, ownKey = 0; const tables = new Set(), models = new Map();
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8"); lines += t.split("\n").length;
    if (/[\\/]api[\\/].*route\.(ts|js)$/.test(f)) api++;
    if (/localStorage\.(get|set)Item/.test(t)) ls++;
    if (/indexedDB|idb-keyval|Dexie/.test(t)) idb++;
    if (/user_api_keys|resolveApiKey|getUserApiKey/.test(t)) ownKey++;
    for (const m of t.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)) if (!COMMON_TABLES.has(m[1])) tables.add(m[1]);
    for (const m of t.matchAll(/\b(gemini-[0-9a-z.\-]+|gpt-[0-9a-z.\-]+|claude-[0-9a-z.\-]+|o[134]-[a-z]+)\b/g)) models.set(m[1], (models.get(m[1]) ?? 0) + 1);
  }
  let pkg = {}; try { pkg = JSON.parse(fs.readFileSync(path.join(base, "package.json"), "utf8")); } catch { /* 없음 */ }
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return {
    files: files.length, lines, api, localStorage: ls, indexedDB: idb, ownKeyFiles: ownKey,
    tables: [...tables].join(","), models: [...models.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]).join(","),
    next: deps.next ?? "", libs: LIBS.filter((l) => deps[l]).join(","),
  };
}

(async () => {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('사용: node scripts/analyze-category.mjs <카테고리 slug|이름>  또는  --slugs a,b,c'); process.exit(1); }
  let programs;
  if (args[0] === "--slugs") {
    programs = (await get(`programs?slug=in.(${args[1]})&select=id,name,slug,version,is_active,badges,app_url,category_id`)).rows;
  } else {
    const cats = (await get("categories?select=id,name,slug")).rows;
    const cat = cats.find((c) => c.slug === args[0] || c.name === args[0]);
    if (!cat) { console.error(`카테고리를 찾지 못했습니다. 있는 값: ${cats.map((c) => `${c.name}(${c.slug})`).join(", ")}`); process.exit(1); }
    console.log(`카테고리: ${cat.name} (${cat.slug})`);
    programs = (await get(`programs?category_id=eq.${cat.id}&select=id,name,slug,version,is_active,badges,app_url&order=name`)).rows;
  }
  const admins = new Set((await get("profiles?is_admin=eq.true&select=id")).rows.map((x) => x.id));
  const rows = [];
  for (const p of programs) {
    const access = (await get(`user_program_access?program_id=eq.${p.id}&select=user_id&limit=1`)).total;
    const logs = (await get(`usage_logs?program_id=eq.${p.id}&select=user_id,created_at&order=created_at.desc&limit=5000`)).rows;
    const users = new Set(logs.map((x) => x.user_id).filter((u) => !admins.has(u)));
    const folder = findFolder(p.slug);
    rows.push({ name: p.name, slug: p.slug, folder: folder ?? "(못 찾음)", version: p.version, active: p.is_active ? "공개" : "비공개", badges: (p.badges ?? []).join(","), access, usage: logs.length, usageMembers: users.size, lastUsed: logs[0]?.created_at?.slice(0, 10) ?? "", ...(folder ? codeFacts(folder) : {}) });
  }
  console.log("\n| 프로그램 | slug | 폴더 | 버전 | 공개 | 배지 | 권한 회원 | 사용 기록(회원·최근) | 코드(파일·줄·API) | 자체 DB 표 | 브라우저 저장(LS·IDB) | 본인 키 사용 파일 | AI 모델 | 주요 라이브러리 |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.name} | \`${r.slug}\` | \`${r.folder}\` | ${r.version} | ${r.active} | ${r.badges} | ${r.access} | ${r.usage}(${r.usageMembers}명·${r.lastUsed || "-"}) | ${r.files ?? "-"}·${r.lines ?? "-"}·${r.api ?? "-"} | ${r.tables || "-"} | ${r.localStorage ?? "-"}·${r.indexedDB ?? "-"} | ${r.ownKeyFiles ?? "-"} | ${r.models || "-"} | ${r.libs || "-"} |`);
  console.log("\n다음 단계: docs/PROGRAM_COMPARISON_ANALYSIS_GUIDE.md §3(코드 확인)·§4(판단 기준)·§5(출력 양식)대로 보고서를 쓴다. 브라우저 저장이 1 이상이면 무엇을 저장하는지 직접 열어 본다(키·결과물·설정 구분).");
})();
