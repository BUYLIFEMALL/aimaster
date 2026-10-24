import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  // next dev가 AGENTS.md(한국어 인수인계 문서)에 영어 안내를 덧붙이지 않게 한다
  agentRules: false,
  turbopack: { root: path.resolve(__dirname) },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ] },
      // 무료 지우기: 교차 출처 격리로 WebGPU 없는 PC도 여러 줄 계산(사전 검증 §7 — credentialless는 외부 이미지 문제 없음). 이 경로에만 둔다
      // 격리된 페이지가 띄우는 작업자·계산 파일도 COEP가 있어야 크롬이 막지 않는다(없으면 작업자 스크립트가 차단됨). 스크립트 파일의 COEP는 다른 페이지에 영향 없음
      { source: "/_next/static/chunks/:path*", headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }] },
      { source: "/ort/:path*", headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }] },
      { source: "/erase", headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ] },
    ];
  },
};
export default config;
