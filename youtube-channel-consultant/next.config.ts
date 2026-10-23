import type { NextConfig } from "next";
import path from "node:path";

// 2026-10-20 v1.11 — YOUTUBE CHANNEL CONSULTANT는 「YOUTUBE 트렌드 분석」(youtube-viral-studio) 안으로 병합됨(병합 C).
// 옛 주소(youtube-channel-consultant.buylife.xyz·*.vercel.app)는 지우지 않고: 화면은 합친 앱의 같은 화면으로 이동,
// API는 합친 앱의 같은 경로로 전달(북마크·외부 호출 유지). 플랜: youtube-viral-studio/docs/PLAN_20261020_MERGE_C_CONSULTANT.md
const MERGED = "https://youtube-viral-studio.buylife.xyz";
const PAGES: [string, string][] = [
  ["/", "/dashboard"],
  ["/dashboard", "/dashboard"],
  ["/channel-analysis", "/channel-analysis"],
  ["/keyword-analysis", "/keyword-analysis"],
  ["/golden-channels", "/golden-channels"],
  ["/settings", "/settings"],
  ["/guide", "/guide"],
  ["/login", "/login"],
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return PAGES.map(([source, to]) => ({ source, destination: `${MERGED}${to}`, permanent: false }));
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/api/:path*", destination: `${MERGED}/api/:path*` }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
