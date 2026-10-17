#!/usr/bin/env node
// 공용 기준 코드(docs/SHARED_MODULES.md) 사본 검사 — 기준 파일과 각 프로그램 사본이 글자 하나까지 같은지 확인한다.
// 사용: node scripts/check-shared-modules.mjs          (전체 검사, 다르면 종료 코드 1)
//       node scripts/check-shared-modules.mjs --sync   (기준 파일 내용으로 사본을 덮어씀 — 기준을 고친 뒤에만)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

// 모듈 목록: 기준(source) 1개 + 사본(copies). 새 모듈은 docs/SHARED_MODULES.md 표와 여기에 함께 추가한다.
const MODULES = [
  {
    id: "youtube-golden-engine",
    source: "youtube-channel-consultant/src/lib/youtube/goldenEngine.ts",
    copies: ["youtube-viral-studio/src/lib/youtube/goldenEngine.ts"],
  },
  {
    id: "youtube-data-client",
    source: "youtube-channel-consultant/src/lib/youtube/youtubeData.ts",
    copies: [
      "youtube-viral-studio/src/lib/youtube/youtubeData.ts",
      "shorts-viral-studio/src/lib/youtube/youtubeData.ts",
      // 2단계(2026-10-17): 폴더 구조가 달라 공용 테스트 파일은 넣지 않고 각 프로그램 기존 테스트로 확인
      "ai-auto-blog/utils/ai/youtubeData.ts",
      "tistory-auto-blog/utils/ai/youtubeData.ts",
      "threads-content-ops/lib/youtubeData.ts",
      "naver-blog-agent/src/lib/youtubeData.ts",
      "trending-product-finder/lib/youtube/youtubeData.ts",
    ],
  },
  {
    id: "youtube-data-client-test",
    source: "youtube-channel-consultant/tests/youtubeData.test.mjs",
    copies: ["youtube-viral-studio/tests/youtubeData.test.mjs", "shorts-viral-studio/tests/youtubeData.test.mjs"],
  },
  {
    // 이미지 생성 호출(엔드포인트·대기·이미지 받아오기). 프롬프트·모델·화질·온도는 각 프로그램 값 그대로(2026-10-17)
    id: "gemini-image-client",
    source: "ai-image-studio/lib/providers/geminiImage.ts",
    copies: [
      "ai-auto-blog/utils/ai/geminiImage.ts",
      "tistory-auto-blog/utils/ai/geminiImage.ts",
      "naver-blog-seo-studio/lib/ai/geminiImage.ts",
      "naver-blog-auto-poster_app/web/lib/naverBlogAutoPoster/geminiImage.ts",
      "naver-blog-auto-poster_web/web/lib/naverBlogAutoPoster/geminiImage.ts",
      "shots/src/lib/ai/geminiImage.ts",
      "blog_auto_poster/src/geminiImage.ts",
    ],
  },
  {
    id: "youtube-golden-engine-test",
    source: "youtube-channel-consultant/tests/goldenEngine.test.mjs",
    copies: ["youtube-viral-studio/tests/goldenEngine.test.mjs"],
  },
];

const sync = process.argv.includes("--sync");
const hash = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
let bad = 0;

for (const m of MODULES) {
  const src = path.join(root, m.source);
  if (!fs.existsSync(src)) {
    console.log(`MISSING  ${m.id}: 기준 파일 없음 ${m.source}`);
    bad++;
    continue;
  }
  const srcHash = hash(src);
  for (const c of m.copies) {
    const dst = path.join(root, c);
    const same = fs.existsSync(dst) && hash(dst) === srcHash;
    if (same) {
      console.log(`OK       ${m.id}: ${c}`);
    } else if (sync) {
      fs.copyFileSync(src, dst);
      console.log(`SYNCED   ${m.id}: ${c} ← ${m.source}`);
    } else {
      console.log(`DIFF     ${m.id}: ${c} (기준 ${m.source} 과 다름 — 기준을 먼저 고치고 --sync)`);
      bad++;
    }
  }
}

if (bad) {
  console.log(`\n${bad}건 불일치`);
  process.exit(1);
}
console.log("\n모든 사본이 기준과 같습니다.");
