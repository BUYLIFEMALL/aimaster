// 2026-11-20 영상 담당(MOV-YVS-SETTINGS-WORDING): AI 키 안내 문구를 한 곳에서 관리한다.
// AI 키(Gemini·OpenAI)는 이 프로그램 설정 화면이 아니라 메인 사이트 「API 설정」에서 등록한다(회원 공용 user_api_keys).
// 예전 문구 「[설정 > YouTube API 키] 메뉴에서 AI 키를 등록」은 실제 화면과 달랐다(그 메뉴에는 AI 키 칸이 없음).

/** 메인 사이트 API 키 등록 화면(모든 프로그램 공용) */
export const AI_KEY_SETTINGS_URL = "https://www.buylife.xyz/api-settings";

/** 쇼츠 대본 분석에 AI 키가 없을 때 안내 */
export const AI_KEY_REQUIRED_MESSAGE =
  "쇼츠 AI 대본 분석을 실행하려면 본인의 Google Gemini 또는 OpenAI API 키가 필요합니다. 메인 사이트 「API 설정」에서 키를 등록해 주세요.";

/** 안내 옆 링크 글자 */
export const AI_KEY_LINK_LABEL = "메인 사이트 API 설정에서 등록 →";

/** 설정 화면 제목 — 좌측 메뉴 이름(「API키등록·플랫폼연동」 표준)과 같게 */
export const SETTINGS_PAGE_TITLE = "API키등록·플랫폼연동";

// A2(맥미니 후속): 설정 화면 실제 구성 = ① YouTube Data API 키(필수) ② AI 엔진 안내(등록은 메인 사이트) ③ 내 채널 연결용 구글 앱(선택).
// 이 프로그램에서 등록하는 것과 메인 사이트에서 등록하는 것을 화면마다 같은 말로 구분한다.

/** 설정 화면 부제 */
export const SETTINGS_PAGE_SUBTITLE =
  "내 YouTube Data API 키와 내 채널 연결용 구글 앱을 여기서 등록합니다. AI 키(Gemini·OpenAI·Claude)는 메인 사이트 「API 설정」에서 등록합니다.";

/** 대시보드 연결 상태 카드 제목 */
export const CONNECTION_STATUS_TITLE = "API 키·플랫폼 연결 상태";

/** 대시보드 AI 엔진 줄 */
export const AI_ENGINE_LABEL = "AI 엔진 (Gemini · OpenAI · Claude)";
export const AI_ENGINE_NOTE_READY = "등록됨 (메인 사이트 API 설정)";
export const AI_ENGINE_NOTE_MISSING = "미등록 (선택: AI 분석 시 필요 — 메인 사이트 API 설정에서 등록)";

/** 이 프로그램 설정 화면으로 가는 버튼 글자 */
export const SETTINGS_LINK_LABEL = `${SETTINGS_PAGE_TITLE}에서 등록 →`;
