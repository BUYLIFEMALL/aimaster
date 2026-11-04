import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // AIMaster 저장소 안의 서브폴더로 존재하므로, 상위 package-lock.json 때문에
  // Next.js가 워크스페이스 루트를 잘못 추론하지 않도록 명시한다.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // RQ-B4(2026-11-04): 등기부 PDF(최대 3MB)를 서버 액션으로 받는다. 기본 1MB라 올린다(Vercel 요청 한도 4.5MB 안)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
