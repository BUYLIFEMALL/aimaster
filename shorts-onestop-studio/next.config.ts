import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // v1.42 무료 음성 여러 줄 계산(교차 출처 격리). credentialless라 외부 그림·스톡 영상은 그대로 — 문제가 생기면 이 두 줄만 빼면 한 줄 계산으로 계속 동작
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ] },
    ];
  },
};
export default config;
