/**
 * Meta OAuth requires an exact redirect URI match. Keep this production
 * callback independent from deployment-preview or optional site URL settings.
 */
// 2026-10-15 독립 서브프로젝트로 분리: 화면은 새 주소, Meta 콜백은 회원이 등록해 둔 옛 주소(메인 사이트가 이 앱으로 전달)를 그대로 쓴다.
export const THREADS_CONTENT_OPS_ORIGIN = "https://threads-content-ops.buylife.xyz";
export const MAIN_SITE_ORIGIN = "https://www.buylife.xyz";
export const THREADS_CONTENT_OPS_CALLBACK_URI =
  "https://www.buylife.xyz/api/threads-content-ops/callback";
