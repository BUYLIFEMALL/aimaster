import type { NextConfig } from "next";
import path from "node:path";

// 2026-10-20 v1.32 — 카드뉴스 스튜디오는 INSTA 포스팅 자동화(auto-instagram-posting) 안으로 병합됨.
// 옛 주소(cardnews-studio.buylife.xyz·*.vercel.app)는 지우지 않고: 화면은 INSTA /cardnews/... 로 이동,
// API는 같은 주소로 INSTA에 전달(회원 cron-job.org 작업·북마크·외부 호출이 그대로 동작). 플랜: insta_auto_poster/docs/PLAN_20261020_CARDNEWS_MERGE.md
const INSTA = "https://auto-instagram-posting.buylife.xyz";
const PAGES: [string, string][] = [
  ["/", "/cardnews"],
  ["/dashboard", "/cardnews"],
  ["/plan", "/cardnews/plan"],
  ["/copy", "/cardnews/copy"],
  ["/design", "/cardnews/design"],
  ["/background", "/cardnews/background"],
  ["/export", "/cardnews/export"],
  ["/guide", "/cardnews/guide"],
  ["/settings", "/cardnews/settings"],
  ["/login", "/login"],
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // sharp 의 공유 라이브러리(libvips)가 서버리스 함수 묶음에서 빠지는 문제를 막는다(운영에서 libvips-cpp.so 로드 실패 확인됨).
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@img/sharp-libvips-linux-x64/**/*", "./node_modules/@img/sharp-linux-x64/**/*"],
  },
  async redirects() {
    return PAGES.map(([source, to]) => ({ source, destination: `${INSTA}${to}`, permanent: false }));
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/api/:path*", destination: `${INSTA}/api/:path*` }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
