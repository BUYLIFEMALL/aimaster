// 2026-10-20 v1.17 — INSTA DM답변 자동화는 INSTA 댓글·DM 자동화(instagram-comment-reply) 안으로 병합됨(병합 B).
// 옛 주소(instagram-dm-reply.buylife.xyz·*.vercel.app)는 지우지 않고: 화면은 합친 앱 /dm/... 로 이동,
// API는 합친 앱의 같은 역할 주소로 전달(회원 Meta 앱에 등록된 DM 웹훅·북마크·외부 호출 유지).
// 플랜: instagram-comment-reply/docs/PLAN_20261020_DM_MERGE.md
const MERGED = "https://instagram-comment-reply.buylife.xyz";
const PAGES = [
  ["/", "/dm"],
  ["/dashboard", "/dm"],
  ["/conversations/:path*", "/dm/conversations/:path*"],
  ["/history", "/dm/history"],
  ["/settings", "/dm/settings"],
  ["/guide", "/dm/guide"],
  ["/login", "/login"],
];
const APIS = [
  ["/api/instagram/dm-webhook/:path*", "/api/instagram/dm-webhook/:path*"],
  ["/api/instagram/callback", "/api/instagram/callback"],
  ["/api/telegram/webhook/:path*", "/api/dm/telegram/webhook/:path*"],
  ["/api/telegram/migrate-webhooks", "/api/dm/telegram/migrate-webhooks"],
  ["/api/cron/check-connection", "/api/dm/cron/check-connection"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () =>
    PAGES.map(([source, to]) => ({ source, destination: `${MERGED}${to}`, permanent: false })),
  rewrites: async () => ({
    beforeFiles: APIS.map(([source, to]) => ({ source, destination: `${MERGED}${to}` })),
    afterFiles: [],
    fallback: [],
  }),
};

export default nextConfig;
