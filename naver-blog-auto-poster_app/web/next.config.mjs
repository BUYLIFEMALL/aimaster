/** @type {import('next').NextConfig} */
// 2026-10-15: 메인 사이트(루트 AIMaster) 안에 있던 naver-blog-auto-poster 웹 화면·API를 독립 서브프로젝트로 분리. 동작은 루트 설정과 같게 둔다.
const nextConfig = {
  experimental: { staleTimes: { dynamic: 0 } },
  headers: async () => [
    { source: "/:path*", headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" }] },
  ],
  redirects: async () => [{ source: "/", destination: "/naver-blog-auto-poster", permanent: false }],
};
export default nextConfig;
