// 이식판: U2 숨김 목록 — 플랜 docs/PLAN_20261024_U2_TRIM.md.
// 원본 기능을 지우지 않고 화면에서만 숨긴다. 단계가 열리면 이 파일에서 해당 줄만 지운다.
// (서버 쪽 차단은 src/server/stagePolicy.ts가 따로 맡는다.)

/** 설정 창에서 숨기는 탭 */
export const TRIM_SETTINGS = new Set<string>([
  'mail-calendar', // 메일·캘린더: 운영자 메일 서버 필요(알림은 U11에서 회원 본인 계정으로)
  'identity', // SSO: AIMaster 통합 계정이 맡음
  'meeting-notes', // AI 회의록: U6에서 다시 엶
  'connections', // 슬랙·구글·깃허브 연결: 운영자 앱이 필요해 최상위 규칙 위반
  'lit-mcp', // MCP: U14 이후 판단
  'public-pages', // 공개 사이트·공개 폼: 외부 공개 안 함
  'developers', // 개발자 API·웹훅: U14 이후 판단
  'requests', // 요금제 업그레이드 요청
  'billing', // 원본 결제(이 프로그램 이용 권한은 메인 사이트가 관리)
  'plans', // 원본 요금제 살펴보기
  'analytics', // 상위 요금제 안내만 보이는 탭
  'audit-log', // 상위 요금제 안내만 보이는 탭
  'content-search', // 상위 요금제 안내만 보이는 탭
]);

/** 사진·표지 고르기에서 숨기는 탭: AI 그림(→ ai-image-studio 링크), 가짜 사진 탭(색 그림에 가짜 작가 이름) */
export const TRIM_MEDIA_TABS = new Set<string>(['ai', 'unsplash', 'giphy']);

/** 새로 추가하는 목록에서 빼는 데이터베이스 보기(이미 만든 보기는 그대로 열림) */
export const TRIM_VIEW_TYPES = new Set<string>(['map']);

/** 원본 요금제 업그레이드 문구·버튼을 보여 줄지(이 프로그램에는 원본 요금제가 없음) */
export const SHOW_PLAN_UPSELL = false;

/** 공유 메뉴의 「게시(웹에 공개)」 탭 */
export const SHOW_PUBLISH_TAB = false;

/** 템플릿 마켓플레이스·구매·후기 */
export const SHOW_MARKETPLACE = false;

/** 계정 메뉴의 다른 계정 추가·전환(AIMaster 통합 계정이 맡음) */
export const SHOW_MULTI_ACCOUNT = false;

/** 알림 설정의 이메일 묶음(운영자 메일 서버 필요) */
export const SHOW_EMAIL_NOTIFICATIONS = false;

export const AIMASTER_HOME_URL = 'https://www.buylife.xyz';
export const AI_IMAGE_STUDIO_URL = 'https://ai-image-studio.buylife.xyz';
