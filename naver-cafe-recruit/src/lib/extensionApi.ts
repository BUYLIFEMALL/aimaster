// 확장 → /api/recruit/extension 요청 검사(서버 함수 ncr_dispatch도 다시 검사한다).
// 확장이 할 수 있는 일은 두 가지뿐: 다음 초대 대상 받기(next_target)와 초대 결과 기록(sent_mark).
// 대상 넣기·승인·설정은 웹 화면에서만 한다(확장이 명단을 마음대로 늘리지 못하게).
import { NAVER_ID, type Payload } from "./recruitApi";

export const CAFE_ID = /^[0-9]{1,15}$/; // 네이버 카페 번호(clubid)는 숫자

export const EXTENSION_OPERATIONS: Record<string, (p: Payload) => boolean> = {
  next_target: p => Object.keys(p).length === 1 && CAFE_ID.test(String(p.cafe_id ?? "")),
  sent_mark: p => Object.keys(p).every(k => ["cafe_id", "naver_id", "result", "detail"].includes(k))
    && CAFE_ID.test(String(p.cafe_id ?? "")) && NAVER_ID.test(String(p.naver_id ?? ""))
    && ["sent", "failed", "limited"].includes(String(p.result))
    && (p.detail === undefined || (typeof p.detail === "string" && p.detail.length <= 200)),
};

/** 쿠키로 인증하는 라우트라 다른 사이트의 요청은 막는다: 확장(chrome-extension://) 또는 같은 주소만 허용. */
export function allowedOrigin(origin: string | null, selfOrigin: string): boolean {
  if (!origin) return false;
  return /^chrome-extension:\/\/[a-p]{32}$/.test(origin) || origin === selfOrigin;
}
