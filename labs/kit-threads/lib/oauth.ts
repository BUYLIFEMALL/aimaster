/**
 * Meta OAuth requires an exact redirect URI match. Keep this production
 * callback independent from deployment-preview or optional site URL settings.
 */
// 2026-10-15 독립 서브프로젝트로 분리: 화면은 새 주소, Meta 콜백은 회원이 등록해 둔 옛 주소(메인 사이트가 이 앱으로 전달)를 그대로 쓴다.
// 2026-10-18 독립 운영 모드(강의용 설치 키트): NEXT_PUBLIC_STANDALONE_MODE=true면 화면·콜백 모두 설치한 사이트 주소(NEXT_PUBLIC_SITE_URL)를 쓴다.
import { IS_STANDALONE, SITE_URL } from "./deployment";
export const THREADS_CONTENT_OPS_ORIGIN = IS_STANDALONE ? SITE_URL : "https://threads-content-ops.buylife.xyz";
export const MAIN_SITE_ORIGIN = IS_STANDALONE ? SITE_URL : "https://www.buylife.xyz";
export const THREADS_CONTENT_OPS_CALLBACK_URI = IS_STANDALONE
  ? `${SITE_URL}/api/threads-content-ops/callback`
  : "https://www.buylife.xyz/api/threads-content-ops/callback";
