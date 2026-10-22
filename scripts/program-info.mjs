// 프로그램 폴더 정보·운영 DB 읽기/쓰기 공통 — 2026-10-23 (Claude Code 윈도우)
// scripts/deploy.mjs·scripts/pending-check.mjs가 쓴다. 키는 루트 .env.local의 서버 키(출력하지 않음).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUPABASE_URL = "https://esgxyikcnnvmlhygjkth.supabase.co"; // ① AIMaster 운영 DB

function walk(dir, out = [], depth = 0) {
  if (depth > 4 || !existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out, depth + 1);
    else if (/\.(ts|tsx|mjs|js)$/.test(n)) out.push(p);
  }
  return out;
}

/** 폴더의 프로그램 slug(`PROGRAM_SLUG`/`THIS_PROGRAM_SLUG` 상수) — 없으면 null */
export function programSlug(folder) {
  for (const base of ["src/lib", "lib"]) {
    for (const f of walk(join(ROOT, folder, base))) {
      const m = readFileSync(f, "utf8").match(/\b(?:THIS_)?PROGRAM_SLUG\s*=\s*["']([^"']+)["']/);
      if (m) return m[1];
    }
  }
  return null;
}

/** 폴더의 화면 버전(`APP_VERSION`) — 없으면 null */
export function appVersion(folder) {
  for (const p of ["src/lib/version.ts", "lib/version.ts", "utils/version.ts", "src/utils/version.ts"]) {
    const f = join(ROOT, folder, p);
    if (existsSync(f)) {
      const m = readFileSync(f, "utf8").match(/APP_VERSION\s*=\s*["'](v\d+\.\d{2})["']/);
      if (m) return m[1];
    }
  }
  return null;
}

function serviceKey() {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m) || env.match(/^SUPABASE_SECRET_KEY=(.*)$/m);
  if (!m) throw new Error(".env.local에 서버 키가 없습니다");
  return m[1].replace(/["'\r]/g, "").trim();
}

export async function rest(path, init = {}) {
  const key = serviceKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DB ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

/** 폴더의 Vercel 프로젝트 이름(.vercel/project.json) — 없으면 null */
export function vercelProject(folder) {
  const f = join(ROOT, folder, ".vercel", "project.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).projectName ?? null : null;
}

/** slug 상수가 없는 폴더는 DB programs.app_url(`https://<이름>.buylife.xyz`·`<프로젝트>.vercel.app`)로 찾는다 */
export function slugFromPrograms(folder, programs) {
  const names = [folder, vercelProject(folder)].filter(Boolean).map((n) => n.toLowerCase().replace(/_/g, "-"));
  const same = programs.find((p) => names.includes(p.slug)); // slug가 폴더·프로젝트 이름과 같은 경우(2026-10-23 detail-page-12p 등 오판 수정)
  if (same) return same.slug;
  const hit = programs.find((p) => names.some((n) => (p.app_url ?? "").toLowerCase().includes(`//${n}.`)));
  return hit?.slug ?? null;
}

/** 30일 정리 크론이 있는 폴더 목록 + 정리 기록(`cleanup_expired`)을 코드에 붙였는지 */
export function cleanupPrograms() {
  const out = [];
  for (const folder of readdirSync(ROOT)) {
    const vj = join(ROOT, folder, "vercel.json");
    if (!existsSync(vj)) continue;
    let crons = [];
    try { crons = JSON.parse(readFileSync(vj, "utf8")).crons ?? []; } catch { continue; }
    const paths = crons.map((c) => c.path).filter((p) => /clean|retention|purge|expire/i.test(p));
    if (!paths.length) continue;
    // 정리 코드에 「cleanup-usage-log: 회원 데이터 아님」 표시가 있으면 회원별 기록 대상이 아니므로 진행률에서 뺀다(2026-10-23)
    const exempt = paths.some((p) => ["src/app", "app"].some((base) => { const f = join(ROOT, folder, base, p.replace(/^\//, ""), "route.ts"); return existsSync(f) && /cleanup-usage-log: 회원 데이터 아님/.test(readFileSync(f, "utf8")); }));
    if (exempt) continue;
    const logs = paths.some((p) => {
      const rel = p.replace(/^\//, "");
      for (const base of ["src/app", "app"]) {
        for (const name of ["route.ts", "route.js"]) {
          const f = join(ROOT, folder, base, rel, name);
          if (existsSync(f) && /cleanup_expired|CLEANUP_ACTION|logCleanupUsage/.test(readFileSync(f, "utf8"))) return true;
        }
      }
      return false;
    });
    out.push({ folder, slug: programSlug(folder), logs });
  }
  return out;
}

/**
 * 운영 DB 표의 실제 칸 목록 — 행이 0건이어도 정확(REST 설명서 OpenAPI). 2026-10-23: 첫 마이그레이션만 보고
 * 「user_id 없음」으로 잘못 판단한 일(real_estate_district_sentiment, 실제로는 v1.12에서 추가됨) 뒤 추가.
 * 반환: [{ name, type, required }] — 표가 없으면 null
 */
export async function tableColumns(table) {
  const key = serviceKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" } });
  if (!res.ok) throw new Error(`DB 설명서 ${res.status}`);
  const defs = (await res.json()).definitions ?? {};
  const d = defs[table];
  if (!d) return { columns: null, similar: Object.keys(defs).filter((t) => t.includes(table) || table.includes(t)).slice(0, 10) };
  const req = new Set(d.required ?? []);
  return { columns: Object.entries(d.properties ?? {}).map(([name, v]) => ({ name, type: v.format || v.type, required: req.has(name) })) };
}

// 명령으로 쓰기: node scripts/program-info.mjs columns <표 이름>   (운영 DB 읽기만, 키 출력 없음)
if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1]) && process.argv[2] === "columns") {
  const table = process.argv[3];
  if (!table) { console.log("사용: node scripts/program-info.mjs columns <표 이름>"); process.exit(1); }
  const { columns, similar } = await tableColumns(table);
  if (!columns) { console.log(`✖ 운영 DB에 「${table}」 표가 없습니다.${similar?.length ? ` 비슷한 표: ${similar.join(", ")}` : ""}`); process.exit(1); }
  console.log(`[${table}] 칸 ${columns.length}개 (운영 DB ${SUPABASE_URL.split("//")[1].split(".")[0]})`);
  for (const c of columns) console.log(`  ${c.name.padEnd(28)} ${String(c.type).padEnd(26)} ${c.required ? "필수" : "비워도 됨"}`);
  console.log(`  user_id 칸: ${columns.some((c) => c.name === "user_id") ? "있음(회원별 표)" : "없음"}`);
}
