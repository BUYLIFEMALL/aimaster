/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep standalone builds inside this program in the shared repository.
  turbopack: { root: process.cwd() },
  // 카드뉴스(2026-10-20 병합) 이미지 처리 sharp의 공유 라이브러리가 서버리스 묶음에서 빠지지 않게(cardnews-studio 설정 그대로)
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@img/sharp-libvips-linux-x64/**/*", "./node_modules/@img/sharp-linux-x64/**/*"],
  },
  experimental: {
    // Server Action 요청 본문 기본 제한(1MB)이 슬라이드 이미지 직접 업로드(최대 10MB 허용,
    // src/lib/actions/slides.ts·upload.ts)보다 작아서, 실제 사진 파일을 올리면 우리 코드의
    // try/catch에 닿기도 전에 "This page couldn't load. A server error occurred." 같은
    // 프레임워크 레벨 에러가 발생했다. 여유를 두고 12mb로 올린다.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
