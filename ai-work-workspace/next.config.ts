import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  // 동기 DB 다리: 작업 스레드 파일(pgworker.mjs)과 postgres 드라이버는 번들하지 않고 그대로 함께 배포한다
  serverExternalPackages: ["postgres"],
  outputFileTracingIncludes: {
    "/**": ["./src/litpage/server/pg/pgworker.mjs", "./node_modules/postgres/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default config;
