import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ] },
      // PDF용 한글 글꼴(약 12MB)은 바뀌지 않으므로 브라우저가 30일간 보관하게 한다
      { source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] },
    ];
  },
};
export default config;
