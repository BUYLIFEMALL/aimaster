import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // BLOG는 AIMaster 저장소 안의 독립 앱이다. 상위 폴더의 package-lock.json을 작업 루트로 잘못 잡지 않게 고정한다.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
