#!/usr/bin/env node
// 검색엔진·광고 로봇 허용 / AI 학습 로봇 차단 시험 (2026-11-11, 최상위 0번 규칙 — 검색엔진 예외)
// 사용: node scripts/check-crawler-access.mjs                 하위 프로그램 public/robots.txt 전부 + 운영 메인 사이트
//       node scripts/check-crawler-access.mjs --live <주소>   운영 주소 하나(robots.txt + 첫 화면을 검색 로봇 이름으로 요청)
// 판정 방식: 구글 robots 규격 — 로봇 이름이 가장 구체적으로 맞는 묶음 하나를 고르고(없으면 *), 그 안에서 가장 긴 규칙, 같으면 Allow 우선.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MUST_ALLOW = ["Googlebot", "Googlebot-Image", "Mediapartners-Google", "AdsBot-Google", "Yeti", "Daumoa", "Bingbot", "OAI-SearchBot", "PerplexityBot"];
export const MUST_BLOCK = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"];

export function parseRobots(text) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === "allow" || key === "disallow")) cur.rules.push({ allow: key === "allow", path: val });
    }
  }
  return groups;
}

function ruleMatches(rulePath, path) {
  if (rulePath === "") return false;
  const re = new RegExp("^" + rulePath.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  return re.test(path);
}

export function isAllowed(groups, agent, path = "/") {
  const ua = agent.toLowerCase();
  let best = null, bestLen = -1;
  for (const g of groups)
    for (const a of g.agents) {
      if (a !== "*" && ua.startsWith(a) && a.length > bestLen) { best = g; bestLen = a.length; }
    }
  // 같은 이름의 묶음이 여러 개면 규칙을 합친다
  const chosen = best ? groups.filter((g) => g.agents.includes(best.agents.find((a) => ua.startsWith(a) && a.length === bestLen))) : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);
  let verdict = true, len = -1;
  for (const r of rules) {
    if (!ruleMatches(r.path, path)) continue;
    const l = r.path.length;
    if (l > len || (l === len && r.allow)) { verdict = r.allow; len = l; }
  }
  return verdict;
}

export function judge(text) {
  const g = parseRobots(text);
  const wrongAllow = MUST_ALLOW.filter((a) => !isAllowed(g, a, "/"));
  const wrongBlock = MUST_BLOCK.filter((a) => isAllowed(g, a, "/"));
  return { ok: !wrongAllow.length && !wrongBlock.length, wrongAllow, wrongBlock };
}

async function live(base) {
  const out = [];
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  const looksRobots = /user-agent/i.test(robots);
  out.push(looksRobots ? `robots.txt: ${JSON.stringify(judge(robots))}` : "robots.txt: 없음(모든 로봇 허용 상태)");
  for (const [name, ua] of [
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["Yeti(네이버)", "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)"],
    ["Mediapartners-Google(애드센스)", "Mediapartners-Google"],
  ]) {
    const res = await fetch(base + "/", { headers: { "User-Agent": ua }, redirect: "follow" });
    const html = await res.text();
    const metaNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
    const header = res.headers.get("x-robots-tag") ?? "";
    out.push(`${name}: HTTP ${res.status}, 페이지 noindex ${metaNoindex ? "있음(문제)" : "없음"}, X-Robots-Tag ${header || "없음"}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, "/").replace(/^([a-z]):/i, (m) => m.toUpperCase()) || process.argv[1]?.endsWith("check-crawler-access.mjs")) {
  const args = process.argv.slice(2);
  if (args[0] === "--live") {
    for (const line of await live(args[1].replace(/\/$/, ""))) console.log(line);
  } else {
    let pass = 0, fail = 0;
    for (const d of readdirSync(ROOT, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith(".") || d.name === "node_modules") continue;
      for (const pub of ["public", "web/public"]) {
        const f = join(ROOT, d.name, pub, "robots.txt");
        if (!existsSync(f) || d.name === "public") continue;
        const r = judge(readFileSync(f, "utf8"));
        if (r.ok) pass++;
        else { fail++; console.log(`✖ ${d.name}/${pub}/robots.txt 허용돼야 하는데 막힘: ${r.wrongAllow.join(",") || "-"} / 막혀야 하는데 열림: ${r.wrongBlock.join(",") || "-"}`); }
      }
    }
    console.log(`[하위 프로그램 robots.txt] 통과 ${pass}개 · 문제 ${fail}개 (검색·광고·AI검색 ${MUST_ALLOW.length}종 허용, AI 학습 ${MUST_BLOCK.length}종 차단 기준)`);
    const main = await (await fetch("https://www.buylife.xyz/robots.txt")).text();
    console.log(`[운영 메인 사이트 robots.txt] ${JSON.stringify(judge(main))}`);
  }
}
