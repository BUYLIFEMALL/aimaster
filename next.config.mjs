/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Next.js 14의 클라이언트 Router Cache는 dynamic 페이지도 기본 30초간 캐시해서,
  // <Link>로 다른 메뉴 갔다가 돌아오면 삭제/정지 같은 방금 반영한 변경사항이 화면에
  // 안 보이는 문제가 있었다 (서버는 최신인데 클라이언트가 이전 렌더를 재사용).
  // dynamic: 0으로 이 캐시를 꺼서 페이지 이동마다 항상 새로 불러오게 한다.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // 서브프로젝트(shop-detail-page 등)가 공용 Supabase Storage에 올리는
        // 프로그램 썸네일/갤러리 이미지를 이 루트 사이트(programs 카탈로그)에서도 표시하기 위함.
        protocol: "https",
        hostname: "esgxyikcnnvmlhygjkth.supabase.co",
      },
    ],
  },
  // threads/, blog/는 이 저장소 안에 독립적으로 존재하는 별개의 Next.js
  // 프로젝트(자체 package.json/배포)다. Next 14의 빌드 타입체크 단계가
  // tsconfig include/exclude와 무관하게 이 하위 폴더들까지 훑어 서로 다른
  // node_modules의 React/Next 타입이 충돌하는 오류를 낸다. 각 프로젝트는
  // 자체 `npm run build`로 이미 독립적으로 타입 검증되므로, 루트 빌드에서는
  // 이 교차 오염만 우회한다.
  typescript: {
    ignoreBuildErrors: true,
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
  // 서브프로젝트 단축 URL(예: buylife.xyz/stepmail)은 next/navigation의 redirect()를 쓰는
  // 페이지 컴포넌트 대신 여기서 처리한다 — 외부 도메인으로 나가는 redirect()는 일반 HTTP
  // 클라이언트(curl 등)에서 정상적인 Location 헤더 없이 __next_error__ 셸만 내려주는 문제가
  // 실제로 발생함(2026-08-18 확인). Next.js의 redirects() 설정은 Vercel 엣지 라우팅 계층에서
  // 바로 처리돼 훨씬 안정적이다.
  redirects: async () => {
    return [
      {
        source: '/stepmail',
        destination: 'https://stepmail-kappa.vercel.app',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
