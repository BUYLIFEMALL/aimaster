#!/usr/bin/env node
// RE-20261117-06 뉴스 N-1 측정(오프라인 가설) — 운영 코드·필터·DB 쓰기·수집·발송·AI 호출 없음.
// 사용:
//   node --no-warnings n1-measure.mjs --fetch <표본.json> [--env <.env.local>]   운영 DB 저장분 읽기만(기본 11-15~11-17 KST, --from/--to UTC 시각으로 바꿈), 회원 ID 저장 안 함
//   node --no-warnings n1-measure.mjs <표본.json>                                 labels.json과 맞춰 가설 A·B 결과표 출력
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (args[0] === "--fetch") {
  const out = args[1];
  const envFile = args.includes("--env") ? args[args.indexOf("--env") + 1] : path.resolve(here, "../../../.env.local");
  const env = Object.fromEntries(fs.readFileSync(envFile, "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
  const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : "2026-11-14T15:00:00Z";
  const to = args.includes("--to") ? args[args.indexOf("--to") + 1] : "2026-11-17T15:00:00Z";
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const q = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/real_estate_news_items?select=id,sgg_nm,category,title,snippet,created_at&created_at=gte.${from}&created_at=lt.${to}&order=created_at.asc,id.asc&limit=1000`;
  const rows = await (await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
  fs.writeFileSync(out, JSON.stringify(rows.map((x) => ({ id8: x.id.slice(0, 8), sgg: x.sgg_nm, cat: x.category, title: x.title, snippet: x.snippet })), null, 1));
  console.log(`표본 ${rows.length}건 저장: ${out}`);
  process.exit(0);
}

const sample = JSON.parse(fs.readFileSync(args[0], "utf8"));
const labelFile = args.includes("--labels") ? args[args.indexOf("--labels") + 1] : path.join(here, "labels.json");
const labels = Object.fromEntries(JSON.parse(fs.readFileSync(labelFile, "utf8")).map((l) => [l.id8, l]));

// 가설 A(IMPROVEMENTS 원안): 분류마다 관련 낱말 묶음 — 제목+요약에 하나도 없으면 뺀다
const CAT_WORDS = {
  개발: ["재개발", "재건축", "정비", "분양", "착공", "준공", "리모델링", "개발"],
  교통: ["GTX", "지하철", "역", "노선", "개통", "철도", "도로"],
  학교: ["학교", "학군", "개교", "초등", "중학", "고등"],
  규제: ["토지거래허가", "토허", "조정대상", "투기과열", "규제"],
};
const hypA = (o) => CAT_WORDS[o.cat].some((w) => (o.title + " " + (o.snippet || "")).includes(w));

// 가설 B: 제목에 부동산 낱말이 있으면 유지. 없으면 요약에서 「지역 이름이 든 문장」에 강한 부동산 낱말이 있을 때만 유지.
// 교통 낱말(지하철·역)은 일부러 강한 낱말에서 뺌 — 네이버 검색어가 요약에 늘 들어가 소음을 남기기 때문.
const STRONG = ["재건축", "재개발", "재초환", "부담금", "분양", "청약", "집값", "아파트값", "시세", "매매", "거래", "호가", "낙폭", "하락", "상승",
  "정비", "토지거래허가", "토허", "규제지역", "조정대상", "투기과열", "리모델링", "입주", "착공", "준공", "용적률"];
const TITLE_WORDS = [...STRONG, "아파트", "부동산", "주택", "전세", "월세", "임대", "오피스텔", "단지", "가구", "세대", "평형", "국평", "급매", "매물", "조합", "공급", "분양가", "개발",
  // B′(앞선 3일 확인 표본에서 잘못 뺀 5건 반영, 2026-11-17): 제목에서만 보는 교통·학군·전세 낱말 — 요약에는 쓰지 않음. 「이사」(대표이사)·「철도」(고속철도 통신)는 오일치로 뺌
  "전셋값", "세입자", "역세권", "노선", "정거장", "GTX", "학군", "학령", "학급", "개교"];
const regionTokens = (sgg) => { const last = sgg.split(" ").pop(); return [last, last.replace(/(구|시|군)$/, "")].filter((t) => t.length >= 2); };
function hypB(o) {
  if (TITLE_WORDS.some((w) => o.title.includes(w))) return "keep";
  const toks = regionTokens(o.sgg);
  const sentences = (o.snippet || "").split(/(?<=[.!?…])\s+|\.\.\./);
  return sentences.some((s) => toks.some((t) => s.includes(t)) && STRONG.some((w) => s.includes(w))) ? "keep" : "drop";
}

const rows = sample.map((o) => ({ ...o, label: labels[o.id8]?.label ?? "?", A: hypA(o) ? "keep" : "drop", B: hypB(o) }));
const miss = rows.filter((r) => r.label === "?");
if (miss.length && !args.includes("--holdout")) { console.error("라벨 없는 기사", miss.length); process.exit(1); }
if (args.includes("--holdout")) { for (const r of rows.filter((r) => r.B === "drop")) console.log(`B 제외 ${r.id8} ${r.sgg} [${r.cat}] ${r.title}`); console.log("---B 유지---"); for (const r of rows.filter((r) => r.B === "keep")) console.log(`B 유지 ${r.id8} ${r.sgg} [${r.cat}] ${r.title}`); process.exit(0); }

const regions = [...new Set(rows.map((r) => r.sgg))];
for (const h of ["A", "B"]) {
  console.log(`\n가설 ${h}`);
  console.log("지역\t\t전체\t유지\t제외\t관련(R) 잘못 제외\t무관(X) 남음\t보류(U) 제외/전체");
  for (const g of [...regions, "합계"]) {
    const rs = g === "합계" ? rows : rows.filter((r) => r.sgg === g);
    const k = rs.filter((r) => r[h] === "keep").length;
    const rDrop = rs.filter((r) => r.label === "R" && r[h] === "drop");
    const xKeep = rs.filter((r) => r.label === "X" && r[h] === "keep");
    const u = rs.filter((r) => r.label === "U");
    console.log(`${g.padEnd(10)}\t${rs.length}\t${k}\t${rs.length - k}\t${rDrop.length}/${rs.filter((r) => r.label === "R").length}\t\t${xKeep.length}/${rs.filter((r) => r.label === "X").length}\t\t${u.filter((r) => r[h] === "drop").length}/${u.length}`);
  }
  for (const r of rows.filter((r) => (r.label === "R" && r[h] === "drop") || (r.label === "X" && r[h] === "keep"))) console.log(`  · ${r.label === "R" ? "잘못 제외" : "무관 남음"} ${r.id8} ${r.sgg} [${r.cat}] ${r.title}`);
  for (const r of rows.filter((r) => r.label === "U" && r[h] === "drop")) console.log(`  · 보류 제외 ${r.id8} ${r.sgg} [${r.cat}] ${r.title}`);
}
