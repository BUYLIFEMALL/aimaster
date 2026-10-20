#!/usr/bin/env node
// 공용 기준 코드(docs/SHARED_MODULES.md) 사본 검사 — 기준 파일과 각 프로그램 사본이 글자 하나까지 같은지 확인한다.
// 이미지 생성 호출(generateGeminiImage)의 최악 소요 시간이 Vercel 300초 한도 안인지도 함께 검사한다(아래 「시간 검사」).
// 사용: node scripts/check-shared-modules.mjs          (전체 검사, 다르면 종료 코드 1)
//       node scripts/check-shared-modules.mjs --sync   (기준 파일 내용으로 사본을 덮어씀 — 기준을 고친 뒤에만)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

// 모듈 목록: 기준(source) 1개 + 사본(copies). 새 모듈은 docs/SHARED_MODULES.md 표와 여기에 함께 추가한다.
const MODULES = [
  {
    // OpenAI 모델별 요청 규칙(추론 모델 GPT-5·GPT-6·o는 temperature 제외·max_completion_tokens) + 모델 안내·거부 이유 문구. 2026-10-20
    // 테스트 기준 naver-blog-seo-studio/tests/openaiRequestParams.test.mjs — 폴더 구조가 달라 사본 테스트는 경로만 다른 자체 파일
    id: "openai-request-params",
    source: "naver-blog-seo-studio/lib/ai/openaiRequestParams.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/ai/openaiRequestParams.ts", "threads-affiliate-poster/src/lib/ai/openaiRequestParams.ts", "style-dna-analyzer/src/lib/ai/openaiRequestParams.ts", "cardnews-studio/src/lib/ai/openaiRequestParams.ts", "naver-blog-allinone/src/lib/blog/openaiRequestParams.ts", "naver-blog-agent/src/lib/ai/openaiRequestParams.ts", "ai-auto-blog/utils/ai/openaiRequestParams.ts", "tistory-auto-blog/utils/ai/openaiRequestParams.ts", "threads-content-ops/lib/openaiRequestParams.ts"],
  },
  {
    // 회원 연동 정보 공용 저장 — 한 번 연결한 플랫폼 계정(member_platform_accounts)을 모든 프로그램이 함께 사용. 2026-10-20, docs/MEMBER_INTEGRATIONS.md
    id: "member-integrations",
    source: "lib/memberIntegrations.ts",
    copies: ["threads/src/lib/memberIntegrations.ts", "threads-comment-reply/lib/memberIntegrations.ts", "threads-affiliate-poster/src/lib/memberIntegrations.ts", "threads-content-ops/lib/memberIntegrations.ts", "insta_auto_poster/src/lib/memberIntegrations.ts", "instagram-comment-reply/lib/memberIntegrations.ts", "instagram-dm-reply/lib/memberIntegrations.ts", "shots/src/lib/memberIntegrations.ts", "cardnews-studio/src/lib/memberIntegrations.ts", "youtube-auto-reply/lib/memberIntegrations.ts", "kakao_auto_poster/src/lib/memberIntegrations.ts", "naver-cafe-poster/src/lib/memberIntegrations.ts", "ai-influencer-studio/src/lib/memberIntegrations.ts", "ai-webtoon-studio/src/lib/memberIntegrations.ts"],
  },
  {
    // 인스타그램 게시(피드 1장·캐러셀 2~10장) — 회원 본인 연결값(insta_accounts, 한 번 연결해 여러 프로그램이 함께 사용). 2026-10-19
    id: "instagram-publish",
    source: "insta_auto_poster/src/lib/instagram/publish.ts",
    copies: ["cardnews-studio/src/lib/instagram/publish.ts", "ai-influencer-studio/src/lib/instagram/publish.ts", "ai-webtoon-studio/src/lib/instagram/publish.ts", "four-cut-comics/src/lib/instagram/publish.ts"],
  },
  {
    // 인스타 예약 게시 시각 검사(10분 뒤~60일·24시간 지연·일시 오류 판정·중복 확인·한국 시간) — 2026-10-20 등록
    id: "insta-schedule-time",
    source: "cardnews-studio/src/lib/cardnews/schedule.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/schedule.ts", "ai-influencer-studio/src/lib/instagram/schedule.ts", "ai-webtoon-studio/src/lib/instagram/schedule.ts", "four-cut-comics/src/lib/instagram/schedule.ts"],
  },
  {
    // 인스타 예약 회원 실행 방식(Vercel / 내 cron-job.org·일시정지 안전 처리·실패 시 되돌리기) — 2026-10-20 등록. 프로그램 값은 각 폴더 schedulerConfig.ts
    // 2026-10-20 인스타 4개 → 예약 프로그램 15개로 확대(구 id insta-member-scheduler). 값은 같은 폴더 schedulerConfig.ts
    id: "member-scheduler",
    source: "cardnews-studio/src/lib/instagram/memberScheduler.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts", 
      "ai-influencer-studio/src/lib/instagram/memberScheduler.ts", "ai-webtoon-studio/src/lib/instagram/memberScheduler.ts", "four-cut-comics/src/lib/instagram/memberScheduler.ts",
      "threads-content-ops/lib/memberScheduler.ts", "threads/src/lib/posts/memberScheduler.ts", "insta_auto_poster/src/lib/posts/memberScheduler.ts", "threads-affiliate-poster/src/lib/posts/memberScheduler.ts",
      "booking-reminder/lib/schedulerMember/memberScheduler.ts", "crm-google-form/lib/schedulerMember/memberScheduler.ts", "kakao_auto_poster/src/lib/schedulerMember/memberScheduler.ts",
      "naver-cafe-poster/src/lib/scheduledSource/memberScheduler.ts", "stepmail/lib/schedulerMember/memberScheduler.ts", "trending-product-finder/lib/schedulerMember/memberScheduler.ts",
      "youtube-auto-reply/lib/schedulerMember/memberScheduler.ts",
    ],
  },
  {
    // 인스타 예약 회원 cron-job.org 작업 만들기·켜기/끄기·지우기 — 2026-10-20 등록. 실행 주소·작업 이름은 각 폴더 schedulerConfig.ts
    id: "insta-cronjob-org",
    source: "cardnews-studio/src/lib/instagram/cronJobOrg.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/instagram/cronJobOrg.ts", "ai-influencer-studio/src/lib/instagram/cronJobOrg.ts", "ai-webtoon-studio/src/lib/instagram/cronJobOrg.ts", "four-cut-comics/src/lib/instagram/cronJobOrg.ts"],
  },
  {
    // 성격·운세 4개 「이어서 보기」 링크(타로점·캐릭코드·성격코드 주소, 넘어온 곳 이름) — 2026-10-20 등록
    id: "personality-program-links",
    source: "personality-suite/src/lib/programLinks.ts",
    copies: ["mbti/lib/programLinks.ts", "mbti-character/lib/programLinks.ts", "tarot/lib/programLinks.ts"],
  },
  {
    // 인스타 예약 화면 동작(상태 줄 훅·상태 문구·게시 기록 시각 문구·예약 취소 훅) — 2026-10-20 등록. 화면 모양과 주소는 각 프로그램
    id: "insta-posts-client",
    source: "cardnews-studio/src/lib/instagram/postsClient.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/instagram/postsClient.ts", "ai-influencer-studio/src/lib/instagram/postsClient.ts", "ai-webtoon-studio/src/lib/instagram/postsClient.ts", "four-cut-comics/src/lib/instagram/postsClient.ts"],
  },
  {
    // 프로그램 공지 띠(메인 공지의 「관련 프로그램」 → 작업 화면 맨 위 최근 공지 1건) — 2026-10-20 등록. 다른 프로그램은 다음 배포 때 사본 추가
    id: "program-notice-banner",
    source: "ai-webtoon-studio/src/components/ProgramNoticeBanner.tsx",
    copies: [],
  },
  {
    // 인스타 게시 처리(즉시·예약 실행 공통 publishPaths, 게시 기록, 30일 정리) — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-posting",
    source: "ai-webtoon-studio/src/lib/instagram/posting.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/posting.ts", "four-cut-comics/src/lib/instagram/posting.ts"],
  },
  {
    // 인스타 게시 기록·예약 등록/취소 API — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-posts-route",
    source: "ai-webtoon-studio/src/app/api/instagram/posts/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/posts/route.ts", "four-cut-comics/src/app/api/instagram/posts/route.ts"],
  },
  {
    // 인스타 예약 실행(Vercel 5분) — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-dispatch-route",
    source: "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/dispatch/route.ts", "four-cut-comics/src/app/api/instagram/dispatch/route.ts"],
  },
  {
    // 인스타 예약 실행(회원 cron-job.org 1분) — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-dispatch-member-route",
    source: "ai-webtoon-studio/src/app/api/instagram/dispatch-member/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/dispatch-member/route.ts", "four-cut-comics/src/app/api/instagram/dispatch-member/route.ts"],
  },
  {
    // 인스타 예약 실행 방식 설정 API — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-scheduler-route",
    source: "ai-webtoon-studio/src/app/api/instagram/scheduler/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/scheduler/route.ts", "four-cut-comics/src/app/api/instagram/scheduler/route.ts"],
  },
  {
    // 외부 주소를 서버에서 가져올 때 내부망·사설 주소 차단(리디렉트마다 재검사, DNS 바꿔치기 방지) — 2026-10-19 기준 등록
    id: "safe-fetch",
    source: "ghost-scraper/src/lib/safeFetch.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/safeFetch.ts", "cardnews-studio/src/lib/safeFetch.ts"],
  },
  {
    // 올린 사진을 브라우저 안에서 풀어 보고 깨졌으면 「사진을 읽지 못했어요」(2026-10-19). 사본은 프로그램을 적용할 때마다 추가
    id: "image-file-check",
    source: "portrait-photo/src/lib/imageFileCheck.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/imageFileCheck.ts", "image-convert-studio/src/lib/imageFileCheck.ts", "photo-remake-studio/src/lib/imageFileCheck.ts", "banana-canvas/src/lib/imageFileCheck.ts", "ai-influencer-studio/src/lib/imageFileCheck.ts", "allinone-graphic/src/lib/imageFileCheck.ts", "four-cut-comics/src/lib/imageFileCheck.ts", "seo-thumbnail-pro/src/lib/imageFileCheck.ts", "cardnews-studio/src/lib/imageFileCheck.ts"],
  },
  {
    id: "image-file-check-test",
    source: "portrait-photo/tests/imageFileCheck.test.mjs",
    copies: ["image-convert-studio/tests/imageFileCheck.test.mjs", "photo-remake-studio/tests/imageFileCheck.test.mjs", "banana-canvas/tests/imageFileCheck.test.mjs", "ai-influencer-studio/tests/imageFileCheck.test.mjs", "allinone-graphic/tests/imageFileCheck.test.mjs", "four-cut-comics/tests/imageFileCheck.test.mjs", "seo-thumbnail-pro/tests/imageFileCheck.test.mjs", "cardnews-studio/tests/imageFileCheck.test.mjs"],
  },
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
      // 2단계 SNS 생성기 묶음(2026-10-17)
      "insta_auto_poster/src/lib/ai/geminiImage.ts",
      "threads/src/lib/ai/geminiImage.ts",
      "threads-affiliate-poster/src/lib/ai/geminiImage.ts",
      "naver-cafe-poster/src/lib/ai/geminiImage.ts",
      "threads-content-ops/lib/geminiImage.ts",
      // 3묶음 단일 주소형(2026-10-17)
      "kakao_auto_poster/src/lib/ai/geminiImage.ts",
      "stepmail/lib/ai/geminiImage.ts",
      "auto-detail-page/lib/ai/geminiImage.ts",
      "tarot/lib/ai/geminiImage.ts",
      "mbti-character/lib/ai/geminiImage.ts",
      "music/lib/ai/geminiImage.ts",
      "naver-blog-agent/src/lib/ai/geminiImage.ts",
      "naver-blog-allinone/src/lib/blog/geminiImage.ts",
      // 4묶음 A 직접 호출형(2026-10-17)
      "cardnews-studio/src/lib/ai/geminiImage.ts",
      "style-dna-analyzer/src/lib/ai/geminiImage.ts",
      "shop-detail-page/lib/ai/geminiImage.ts",
      "blog-content-maker/src/lib/geminiImage.ts",
      "blog-workroom/src/lib/geminiImage.ts",
      "music-video-studio/src/lib/ai/geminiImage.ts",
      "emotion-writer/src/lib/studio/geminiImage.ts",
      "photo-remake-studio/src/lib/geminiImage.ts",
      "shorts-onestop-studio/src/lib/geminiImage.ts",
      "seo-thumbnail-pro/src/lib/geminiImage.ts",
      // 4묶음 B SDK 사용형(2026-10-18)
      "playlist-channel-studio/src/lib/geminiImage.ts",
      "four-cut-comics/src/lib/geminiImage.ts",
      "thumbnail-master/src/lib/geminiImage.ts",
      "portrait-photo/src/lib/geminiImage.ts",
      "banana-canvas/src/lib/geminiImage.ts",
      "fashion-style/src/lib/geminiImage.ts",
      "allinone-graphic/src/lib/geminiImage.ts",
      "cinematic-storyboard-studio/src/lib/geminiImage.ts",
      "ai-influencer-studio/src/lib/geminiImage.ts",
      // 5묶음 Imagen 교체분(2026-10-18)
      "yt-playlist-studio/src/lib/geminiImage.ts",
      "ai-webtoon-studio/src/lib/geminiImage.ts",
      "ebook-studio/src/lib/geminiImage.ts",
      "detail-page-12p/src/lib/geminiImage.ts",
      "vinyl-lp-studio/src/lib/geminiImage.ts",
    ],
  },
  {
    // 나노바나나 등급별 모델·화질·온도(2026-10-17 주인님 지시로 통합). 파일 이름은 프로그램마다 달라도 내용은 같다
    id: "gemini-image-models",
    source: "ai-image-studio/lib/providers/nanoBananaModels.ts",
    copies: [
      "ai-auto-blog/utils/news/nanoBananaConfig.ts",
      "tistory-auto-blog/utils/news/nanoBananaConfig.ts",
      "naver-blog-seo-studio/lib/ai/nanoBananaConfig.ts",
      "naver-blog-auto-poster_app/web/lib/naverBlogAutoPoster/nanoBananaConfig.ts",
      "naver-blog-auto-poster_web/web/lib/naverBlogAutoPoster/nanoBananaConfig.ts",
      "shots/src/lib/ai/nanoBananaModels.ts",
      "blog_auto_poster/src/nanoBananaConfig.ts",
      // 2단계 SNS 생성기 묶음(2026-10-17)
      "insta_auto_poster/src/lib/ai/nanoBananaModels.ts",
      "threads/src/lib/ai/nanoBananaModels.ts",
      "threads-affiliate-poster/src/lib/ai/nanoBananaModels.ts",
      "naver-cafe-poster/src/lib/ai/nanoBananaModels.ts",
      "threads-content-ops/lib/nanoBananaModels.ts",
      // 3묶음 단일 주소형(2026-10-17)
      "kakao_auto_poster/src/lib/ai/nanoBananaModels.ts",
      "stepmail/lib/ai/nanoBananaModels.ts",
      "auto-detail-page/lib/ai/nanoBananaModels.ts",
      "tarot/lib/ai/nanoBananaModels.ts",
      "mbti-character/lib/ai/nanoBananaModels.ts",
      "music/lib/ai/nanoBananaModels.ts",
      "naver-blog-agent/src/lib/ai/nanoBananaModels.ts",
      "naver-blog-allinone/src/lib/blog/nanoBananaModels.ts",
      // 4묶음 A 직접 호출형(2026-10-17)
      "cardnews-studio/src/lib/ai/nanoBananaModels.ts",
      "style-dna-analyzer/src/lib/ai/nanoBananaModels.ts",
      "shop-detail-page/lib/ai/nanoBananaModels.ts",
      "blog-content-maker/src/lib/nanoBananaModels.ts",
      "blog-workroom/src/lib/nanoBananaModels.ts",
      "music-video-studio/src/lib/ai/nanoBananaModels.ts",
      "emotion-writer/src/lib/studio/nanoBananaModels.ts",
      "photo-remake-studio/src/lib/nanoBananaModels.ts",
      "shorts-onestop-studio/src/lib/nanoBananaModels.ts",
      "seo-thumbnail-pro/src/lib/nanoBananaModels.ts",
      // 4묶음 B SDK 사용형(2026-10-18)
      "playlist-channel-studio/src/lib/nanoBananaModels.ts",
      "four-cut-comics/src/lib/nanoBananaModels.ts",
      "thumbnail-master/src/lib/nanoBananaModels.ts",
      "portrait-photo/src/lib/nanoBananaModels.ts",
      "banana-canvas/src/lib/nanoBananaModels.ts",
      "fashion-style/src/lib/nanoBananaModels.ts",
      "allinone-graphic/src/lib/nanoBananaModels.ts",
      "cinematic-storyboard-studio/src/lib/nanoBananaModels.ts",
      "ai-influencer-studio/src/lib/nanoBananaModels.ts",
      // 5묶음 Imagen 교체분(2026-10-18)
      "yt-playlist-studio/src/lib/nanoBananaModels.ts",
      "ai-webtoon-studio/src/lib/nanoBananaModels.ts",
      "ebook-studio/src/lib/nanoBananaModels.ts",
      "detail-page-12p/src/lib/nanoBananaModels.ts",
      "vinyl-lp-studio/src/lib/nanoBananaModels.ts",
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
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      console.log(`SYNCED   ${m.id}: ${c} ← ${m.source}`);
    } else {
      console.log(`DIFF     ${m.id}: ${c} (기준 ${m.source} 과 다름 — 기준을 먼저 고치고 --sync)`);
      bad++;
    }
  }
}

// 이미지 생성 호출 시간 검사(2026-10-17, docs/SHARED_MODULE_CHECKPOINTS.md §2-1):
// generateGeminiImage() 호출마다 최악 소요 시간 = (retries+1) × timeoutMs + 재시도 전 대기(1.5초 × 회차)를 계산해
// Vercel 함수 한도 300초를 넘으면 실패로 본다. 값을 읽지 못한 호출은 CHECK(직접 확인)로만 표시한다.
// 앞뒤의 다른 작업 시간과 한 요청 안의 여러 번 호출은 계산하지 않는다 — 그 부분은 사람이 확인한다.
const LIMIT_SEC = 300;
const DEFAULT_TIMEOUT_MS = 120_000; // 기준 geminiImage.ts 기본값과 같게 유지
const DEFAULT_RETRIES = 1;
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out", "public", ".vercel", "tests", "test"]);
const imageModule = MODULES.find((m) => m.id === "gemini-image-client");
const programDirs = [...new Set([imageModule.source, ...imageModule.copies].map((p) => p.split("/")[0]))];

function listCode(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".")) listCode(path.join(dir, e.name), acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && !/^geminiImage\./.test(e.name)) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

function callArgs(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return text.slice(start + 1, i);
  }
  return "";
}

// 숫자 또는 같은 파일의 숫자 상수만 읽는다(예: 110_000, 4 * 60_000, IMAGE_TIMEOUT_MS). 못 읽으면 null.
function resolveNumber(expr, text) {
  const e = expr.trim();
  if (/^[\d_\s*+()]+$/.test(e)) return Function(`return (${e.replace(/_/g, "")})`)();
  if (/^[A-Za-z_$][\w$]*$/.test(e)) {
    const m = text.match(new RegExp(`(?:const|let)\\s+${e}\\s*(?::[^=]+)?=\\s*([\\d_\\s*+()]+)[;\\n]`));
    if (m) return resolveNumber(m[1], text);
  }
  return null;
}

// 호출 객체의 최상위 내용만 남긴다(parts 배열 안의 ...펼치기 같은 안쪽 값은 지움).
function topLevel(args) {
  let depth = 0;
  let out = "";
  for (const ch of args) {
    if ("{[(".includes(ch)) depth++;
    if (depth <= 1) out += ch;
    if ("}])".includes(ch)) depth--;
  }
  return out;
}

function option(rawArgs, name, fallback, text) {
  const args = topLevel(rawArgs);
  const m = args.match(new RegExp(`\\b${name}\\s*:\\s*([^,}\\n]+)`));
  if (m) return resolveNumber(m[1], text);
  if (new RegExp(`\\b${name}\\b`).test(args) || /\.\.\./.test(args)) return null; // 줄임 표기·펼치기는 직접 확인
  return fallback;
}

let timeChecked = 0;
let timeUnknown = 0;
console.log("");
for (const dir of programDirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of listCode(abs)) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).replace(/\\/g, "/");
    for (const hit of text.matchAll(/generateGeminiImage\s*\(/g)) {
      const open = hit.index + hit[0].length - 1;
      const args = callArgs(text, open);
      const line = text.slice(0, hit.index).split("\n").length;
      const timeoutMs = option(args, "timeoutMs", DEFAULT_TIMEOUT_MS, text);
      const retries = option(args, "retries", DEFAULT_RETRIES, text);
      timeChecked++;
      if (timeoutMs == null || retries == null) {
        timeUnknown++;
        console.log(`CHECK    시간: ${rel}:${line} (timeoutMs·retries 값을 읽지 못함 — 최악 시간이 ${LIMIT_SEC}초 안인지 직접 확인)`);
        continue;
      }
      let waitMs = 0;
      for (let a = 1; a <= retries; a++) waitMs += 1500 * a;
      const worst = ((retries + 1) * timeoutMs + waitMs) / 1000;
      const detail = `최악 ${worst}초 = ${timeoutMs / 1000}초 × ${retries + 1}회 + 대기 ${waitMs / 1000}초`;
      if (worst > LIMIT_SEC) {
        console.log(`OVER     시간: ${rel}:${line} ${detail} > ${LIMIT_SEC}초 — timeoutMs를 줄이거나 retries: 0`);
        bad++;
      } else {
        console.log(`OK       시간: ${rel}:${line} ${detail}`);
      }
    }
  }
}
console.log(`이미지 호출 ${timeChecked}곳 시간 검사(직접 확인 ${timeUnknown}곳)`);

if (bad) {
  console.log(`\n${bad}건 문제(사본 불일치·시간 초과)`);
  process.exit(1);
}
console.log("\n모든 사본이 기준과 같고, 이미지 호출 시간이 300초 안입니다.");
