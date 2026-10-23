import type { NextConfig } from "next";
import path from "node:path";

// 2026-10-20 v1.15 — Youtube Playlist 자동화는 「YOUTUBE 플레이리스트 자동화」(playlist-channel-studio) 안 「영상 만들기」(/video)로 병합됨(병합 E).
// 옛 주소(youtube-playlist.buylife.xyz·*.vercel.app)는 지우지 않고: 화면은 합친 앱으로 이동, API는 합친 앱의 같은 경로로 전달.
// 플랜: playlist-channel-studio/docs/PLAN_20261020_MERGE_E_PLAYLIST_VIDEO.md
const MERGED = "https://playlist-maker.buylife.xyz";
const PAGES: [string, string][] = [
  ["/", "/video"],
  ["/guide", "/guide"],
  ["/login", "/login"],
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return PAGES.map(([source, to]) => ({ source, destination: `${MERGED}${to}`, permanent: false }));
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/api/:path*", destination: `${MERGED}/api/:path*` }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
