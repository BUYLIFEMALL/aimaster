import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // AIMaster 저장소 안의 하위 폴더라서, 상위 package-lock.json·middleware.ts를
  // 프로젝트 범위로 잘못 잡지 않도록 이 폴더를 루트로 지정한다.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
