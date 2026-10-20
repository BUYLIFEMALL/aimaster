import type { NextConfig } from "next";
import path from "node:path";

// 2026-10-20 v1.12 — AI 유튜브 썸네일 프로는 「AI 썸네일·SEO 자동화」(thumbnail-master) 안으로 병합됨(병합 D).
// 옛 주소(seo-thumbnail-pro.buylife.xyz·*.vercel.app)는 지우지 않고 화면만 합친 앱 「SEO 전략」(/seo)으로 이동한다.
// API는 전달하지 않는다 — 이 앱의 /api/user/key는 회원 키 원문을 돌려주던 주소라 410으로 막았다(src/app/api/user/key/route.ts).
// 플랜: thumbnail-master/docs/PLAN_20261020_MERGE_D_SEO_PRO.md
const MERGED = "https://thumbnail-master.buylife.xyz";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      { source: "/", destination: `${MERGED}/seo`, permanent: false },
      { source: "/login", destination: `${MERGED}/login`, permanent: false },
    ];
  },
};

export default nextConfig;
