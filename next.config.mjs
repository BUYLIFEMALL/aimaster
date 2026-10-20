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
  // threads/, ai-auto-blog/ 등은 이 저장소 안에 독립적으로 존재하는 별개의 Next.js
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
  // 2026-10-15: 쓰레드 콘텐츠 운영(threads-content-ops)을 독립 서브프로젝트로 분리했다(https://threads-content-ops.buylife.xyz).
  // 옛 화면 주소는 새 주소로 보내고, 옛 API 주소(회원이 Meta 앱에 등록한 OAuth 콜백, 설치된 데스크톱 앱이 부르는 whoami·generate,
  // 이전 북마크)는 지우지 않고 새 앱으로 그대로 전달한다(도메인 정책: 옛 주소는 삭제하지 않음).
  rewrites: async () => [
    { source: "/api/threads-content-ops/:path*", destination: "https://threads-content-ops.buylife.xyz/api/threads-content-ops/:path*" },
    // 네이버 블로그 자동화 App(데스크톱)·Web(확장)도 같은 날 분리: 설치된 앱·확장이 부르는 옛 API 주소를 새 앱으로 전달한다.
    { source: "/api/naver-blog-auto-poster/:path*", destination: "https://naver-blog-auto-poster.buylife.xyz/api/naver-blog-auto-poster/:path*" },
    { source: "/api/naver-blog-auto-poster-web/:path*", destination: "https://naver-blog-auto-poster-web.buylife.xyz/api/naver-blog-auto-poster-web/:path*" },
  ],
  redirects: async () => {
    return [
      { source: "/threads-content-ops", destination: "https://threads-content-ops.buylife.xyz/threads-content-ops", permanent: false },
      { source: "/threads-content-ops/:path*", destination: "https://threads-content-ops.buylife.xyz/threads-content-ops/:path*", permanent: false },
      { source: "/naver-blog-auto-poster", destination: "https://naver-blog-auto-poster.buylife.xyz/naver-blog-auto-poster", permanent: false },
      { source: "/naver-blog-auto-poster-web", destination: "https://naver-blog-auto-poster-web.buylife.xyz/naver-blog-auto-poster-web", permanent: false },
      // 2026-10-20 INSTA Cardnews 자동화는 INSTA 포스팅 자동화 안으로 병합(카탈로그 노출 중지) — 옛 상세 주소·북마크는 INSTA 상세로
      { source: "/programs/cardnews-studio", destination: "/programs/auto-instagram-posting", permanent: false },
      // 2026-10-20 INSTA DM답변 자동화는 INSTA 댓글·DM 자동화 안으로 병합(카탈로그 노출 중지) — 옛 상세 주소·북마크는 합친 프로그램 상세로
      { source: "/programs/instagram-dm-reply", destination: "/programs/instagram-comment-reply", permanent: false },
      // 2026-10-20 YOUTUBE CHANNEL CONSULTANT는 YOUTUBE 트렌드 분석(youtube-viral-studio) 안으로 병합(카탈로그 노출 중지)
      { source: "/programs/youtube-channel-consultant", destination: "/programs/youtube-viral-studio", permanent: false },
      // 2026-10-20 AI 유튜브 썸네일 프로는 AI 썸네일·SEO 자동화(thumbnail-master) 안으로 병합(카탈로그 노출 중지)
      { source: "/programs/seo-thumbnail-pro", destination: "/programs/thumbnail-master", permanent: false },
      // 2026-10-20 Youtube Playlist 자동화는 YOUTUBE 플레이리스트 자동화(playlist-channel-studio) 「영상 만들기」로 병합(카탈로그 노출 중지)
      { source: "/programs/yt-playlist-studio", destination: "/programs/playlist-channel-studio", permanent: false },
      {
        source: '/stepmail',
        destination: 'https://stepmail.buylife.xyz',
        permanent: false,
      },
      // BLOG(원문)생성 자동화(ai-auto-blog)는 2026-10-01부터 자체 Vercel 프로젝트로 단독 배포된다.
      // 예전 루트 내장 주소(/blog, /blog/posts/123 등)로 들어오는 링크·북마크를 같은 경로의 새 주소로 넘긴다.
      {
        source: '/blog',
        destination: 'https://ai-auto-blog-one.vercel.app',
        permanent: false,
      },
      {
        source: '/blog/:path*',
        destination: 'https://ai-auto-blog-one.vercel.app/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
