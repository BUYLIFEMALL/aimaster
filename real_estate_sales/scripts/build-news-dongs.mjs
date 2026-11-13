// 지역 뉴스 레이더용 동 이름 표 만들기(2026-11-13, docs/PLAN_20261113_NEWS_NOISE.md).
// 입력: realty-listing-alert/public/regions.json(전국 시군구 → 법정동). 출력: src/lib/news/dongNames.ts
// 쓰는 곳: 기사 제목에 그 구의 동 이름(반포·방배…)이 있으면 「제목에 지역 있음」으로 본다(거르기에서 지켜 주는 용도).
// 실행: node scripts/build-news-dongs.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regions = JSON.parse(fs.readFileSync(path.join(root, "..", "realty-listing-alert", "public", "regions.json"), "utf8"));
// 흔한 낱말과 같아 다른 기사를 잘못 지켜 줄 이름은 뺀다
const SKIP = new Set(["중동", "상동", "하동", "신원", "교동", "본동", "대원", "신사", "평화", "중앙", "신흥", "성수", "화정", "정자", "인사"]);
const out = {};
for (const sido of regions) {
  for (const g of sido.g) {
    const names = new Set();
    for (const [, dong] of g.d) {
      if (/\s/.test(dong)) continue; // 「남양읍 남양리」 같은 리는 뺀다
      const m = dong.match(/^(.+?)(\d*가|동)$/); // 동·가로 끝나는 이름만(읍·면은 구 이름과 헷갈리지 않아 뺌)
      if (!m) continue;
      const stem = m[1].replace(/동$/, "").replace(/\d+$/, "");
      if (stem.length >= 2 && !SKIP.has(stem) && !SKIP.has(stem + "동")) names.add(stem);
    }
    if (names.size) out[g.c] = [...names];
  }
}
const body = `// 시군구 코드 → 동 이름(끝의 「동」「n가」를 뗀 2글자 이상). 만드는 법: scripts/build-news-dongs.mjs. 직접 고치지 않는다.\nexport const NEWS_DONGS: Record<string, string[]> = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(root, "src", "lib", "news", "dongNames.ts"), body);
console.log(`시군구 ${Object.keys(out).length}곳, ${Buffer.byteLength(body)}바이트`);
