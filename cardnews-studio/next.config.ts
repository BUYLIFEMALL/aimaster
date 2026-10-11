import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // sharp 의 공유 라이브러리(libvips)가 서버리스 함수 묶음에서 빠지는 문제를 막는다(운영에서 libvips-cpp.so 로드 실패 확인됨).
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@img/sharp-libvips-linux-x64/**/*", "./node_modules/@img/sharp-linux-x64/**/*"],
  },
};

export default nextConfig;
