import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // AIMaster 저장소 안의 하위 폴더라서, 상위 package-lock.json·middleware.ts를
  // 프로젝트 범위로 잘못 잡지 않도록 이 폴더를 루트로 지정한다.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // D23 상품 엑셀 올리기 — 서버 동작 기본 한도(1MB)를 4MB로. Vercel 함수 요청 한도(4.5MB) 아래로 둔다
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
