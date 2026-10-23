// 문서 속 프로그램 주소 점검(2026-10-23, Claude Code 윈도우) — 보고·문서에 연결 안 되는 *.buylife.xyz 주소를 쓰는 일을 막는다.
// 계기: INSTA 실제 주소는 auto-instagram-posting.buylife.xyz인데 insta-auto-poster.buylife.xyz(연결 안 됨)를 보고 링크로 씀.
// 사용: node scripts/check-app-urls.mjs          문서(*.md)의 *.buylife.xyz 중 DB programs.app_url에 없는 호스트를 접속해 보고, 연결 안 되면 파일:줄과 추천 주소를 보여 줌
//       node scripts/check-app-urls.mjs --app    위에 더해 모든 programs.app_url이 실제로 응답하는지 확인
//       node scripts/check-app-urls.mjs <slug>   그 프로그램의 실제 주소만 출력(보고에 링크 쓰기 전 확인용)
// 읽기 전용(DB 쓰기·파일 수정 없음). 옛 기록 문서는 고치지 않고 알려 주기만 한다.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const args = process.argv.slice(2);

const { data: programs, error } = await db.from("programs").select("slug,name,app_url");
if (error) { console.error("programs 조회 실패:", error.message); process.exit(1); }
const hostOf = (u) => { try { return new URL(u).host.toLowerCase(); } catch { return ""; } };
const appHosts = new Map(programs.filter((p) => p.app_url).map((p) => [hostOf(p.app_url), p]));

const slug = args.find((a) => !a.startsWith("--"));
if (slug) {
  const p = programs.find((x) => x.slug === slug || x.slug.includes(slug) || x.name?.includes(slug));
  console.log(p ? `${p.name} (${p.slug}): ${p.app_url ?? "app_url 없음"}` : `프로그램을 찾지 못했습니다: ${slug}`);
  process.exit(p ? 0 : 1);
}

const reach = async (url) => {
  try { const r = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(15000) }); return r.status; }
  catch (e) { return `연결 실패(${e.cause?.code ?? e.name})`; }
};

// 1) 문서 속 *.buylife.xyz 주소 모으기
const SKIP = new Set(["node_modules", ".next", ".git", "labs", ".vercel", "dist", "out"]);
const found = new Map(); // host -> [file:line]
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p);
    else if (name.endsWith(".md")) {
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/https?:\/\/([a-z0-9-]+\.buylife\.xyz)/gi)) {
          const h = m[1].toLowerCase();
          if (!found.has(h)) found.set(h, []);
          const at = `${relative(root, p).replace(/\\/g, "/")}:${i + 1}`;
          if (!found.get(h).includes(at)) found.get(h).push(at); // 한 줄에 같은 주소가 두 번 있어도 한 번만
        }
      });
    }
  }
};
walk(root);

const OK_HOSTS = new Set(["www.buylife.xyz", "buylife.xyz"]);
const unknown = [...found.keys()].filter((h) => !appHosts.has(h) && !OK_HOSTS.has(h));
const broken = [];
for (const h of unknown) {
  const status = await reach(`https://${h}/`);
  if (typeof status !== "number") broken.push({ h, status });
}
// 추천: 호스트 단어의 앞 4글자가 slug·주소·이름에 들어 있는 수로 순위(후보 2개까지 — 확정이 아니라 찾아볼 곳)
const suggest = (h) => {
  const words = h.split(".")[0].split("-").filter((w) => w.length > 2).map((w) => w.slice(0, 4));
  const ranked = programs.filter((p) => p.app_url).map((p) => { const hay = `${p.slug} ${hostOf(p.app_url)}`; return { p, score: words.filter((w) => hay.includes(w)).length }; }).filter((x) => x.score).sort((a, b) => b.score - a.score).slice(0, 2);
  return ranked.length ? ranked.map((x) => `${x.p.name} ${x.p.app_url}`).join(" 또는 ") : "후보 없음(새 프로그램 제안 이름일 수 있음)";
};

console.log(`[문서 속 주소] buylife.xyz 호스트 ${found.size}개 · DB app_url과 같은 것 ${found.size - unknown.length - [...found.keys()].filter((h) => OK_HOSTS.has(h)).length}개 · DB에 없는 것 ${unknown.length}개(접속 확인)`);
if (!broken.length) console.log("  ✔ 연결 안 되는 주소 없음");
for (const b of broken) {
  const where = found.get(b.h);
  console.log(`  ⚠ https://${b.h} — ${b.status} · 후보: ${suggest(b.h)}`);
  console.log(`     쓰인 곳 ${where.length}곳: ${where.slice(0, 6).join(", ")}${where.length > 6 ? " …" : ""}`);
}

// 2) --app: 모든 app_url 응답
if (args.includes("--app")) {
  const bad = [];
  for (const p of programs.filter((x) => x.app_url)) { const s = await reach(p.app_url); if (typeof s !== "number" || s >= 500) bad.push(`${p.slug}: ${p.app_url} → ${s}`); }
  console.log(`[DB app_url] ${programs.filter((x) => x.app_url).length}개 확인 · 응답 이상 ${bad.length}개`);
  for (const b of bad) console.log(`  ⚠ ${b}`);
}
console.log("보고에 프로그램 링크를 쓸 때는 `node scripts/check-app-urls.mjs <slug>`로 DB의 실제 주소를 확인하세요. 옛 기록 문서는 고치지 않습니다.");
process.exit(broken.length ? 1 : 0);
