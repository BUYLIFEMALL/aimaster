import type { InstagramBusinessAccount } from "./client";

// OAuth 콜백과 페이지 선택 화면(accounts/select) 사이에서 access token을 잠깐
// 들고 있는 데 쓰는 httpOnly 쿠키. 사용자가 페이지를 확정 선택하기 전까지는
// insta_accounts 테이블에 아무것도 저장하지 않는다.
export const PENDING_INSTAGRAM_CONNECTION_COOKIE = "insta_pending_connection";

export interface PendingInstagramConnection {
  accessToken: string;
  expiresInSeconds: number;
  candidates: InstagramBusinessAccount[];
}
