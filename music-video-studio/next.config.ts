import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // v1.16 윈도우에서 배포한 빌드의 함수 묶음에 sharp 리눅스 공유 라이브러리(libvips)가 빠져 /api/music/image가 500 HTML을 돌려줌
  // (루트 docs/ERROR_LESSONS.md 2026-10-11 「Vercel 함수에서 sharp 로드 실패」와 같은 해결)
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@img/sharp-libvips-linux-x64/**/*", "./node_modules/@img/sharp-linux-x64/**/*"],
  },
};

export default nextConfig;
