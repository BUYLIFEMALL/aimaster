/** @type {import('next').NextConfig} */
// 2026-10-15: 메인 사이트(루트 AIMaster) 안에서 돌던 쓰레드 콘텐츠 운영을 독립 서브프로젝트로 분리.
// 설정은 루트 next.config.mjs의 동작(라우터 캐시 끔, 공용 Storage 이미지, no-store 헤더)을 그대로 따른다.
const nextConfig = {
  experimental: { staleTimes: { dynamic: 0 } },
  images: { remotePatterns: [{ protocol: "https", hostname: "esgxyikcnnvmlhygjkth.supabase.co" }] },
  headers: async () => [
    { source: "/:path*", headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" }] },
  ],
  redirects: async () => [{ source: "/", destination: "/threads-content-ops", permanent: false }],
};
export default nextConfig;
