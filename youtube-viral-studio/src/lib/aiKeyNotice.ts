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
