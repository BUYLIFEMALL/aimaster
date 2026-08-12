/** @type {import('next').NextConfig} */
const nextConfig = {
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
