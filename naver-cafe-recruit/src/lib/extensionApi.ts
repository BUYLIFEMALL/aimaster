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
  // 모드 A-1: 게시판 목록 한 페이지의 작성자(닉네임·등급)만. 아이디·회원 번호 칸은 받지 않는다.
  members_add: p => Object.keys(p).every(k => ["cafe_id", "cafe_name", "board_id", "board_name", "rows"].includes(k))
    && CAFE_ID.test(String(p.cafe_id ?? "")) && /^[0-9]{0,15}$/.test(String(p.board_id ?? ""))
    && ["cafe_name", "board_name"].every(k => p[k] === undefined || (typeof p[k] === "string" && (p[k] as string).length <= 100))
    && Array.isArray(p.rows) && p.rows.length >= 1 && p.rows.length <= 50
    && p.rows.every(r => !!r && typeof r === "object" && Object.keys(r).every(k => k === "nickname" || k === "member_grade")
      && typeof (r as Payload).nickname === "string" && String((r as Payload).nickname).trim().length >= 1 && String((r as Payload).nickname).length <= 40
      && ((r as Payload).member_grade === undefined || (typeof (r as Payload).member_grade === "string" && String((r as Payload).member_grade).length <= 50))),
};

/** 쿠키로 인증하는 라우트라 다른 사이트의 요청은 막는다: 확장(chrome-extension://) 또는 같은 주소만 허용. */
export function allowedOrigin(origin: string | null, selfOrigin: string): boolean {
  if (!origin) return false;
  return /^chrome-extension:\/\/[a-p]{32}$/.test(origin) || origin === selfOrigin;
}
