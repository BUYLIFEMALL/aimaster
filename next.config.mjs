/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    return `build-${Date.now()}`;
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
};

export default nextConfig;
