// D34 입점형 마켓플레이스 — 공급사 상태·글자. DB(0053)가 권한·상태 변경을 다시 검사한다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type SupplierStatus = "invited" | "active" | "paused" | "revoked";

export type SupplierRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  name: string;
  email: string;
  biz_no: string;
  contact_name: string;
  phone: string;
  memo: string;
  status: SupplierStatus;
  invite_expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export const SUPPLIER_COLUMNS = "id, store_id, user_id, name, email, biz_no, contact_name, phone, memo, status, invite_expires_at, accepted_at, created_at";

export const SUPPLIER_STATUS_LABEL: Record<SupplierStatus, string> = {
  invited: "수락 대기",
  active: "입점 중",
  paused: "쉬는 중",
  revoked: "초대 거둠",
};

/** 운영자가 고를 수 있는 다음 상태 — DB 함수와 같은 규칙 */
export function nextStatuses(s: SupplierStatus): SupplierStatus[] {
  if (s === "invited") return ["invited", "revoked"];
  if (s === "active" || s === "paused") return ["active", "paused"];
  return [];
}

/** 초대 링크가 아직 쓸 수 있는가 */
export function inviteAlive(row: Pick<SupplierRow, "status" | "invite_expires_at">, now = Date.now()): boolean {
  return row.status === "invited" && !!row.invite_expires_at && new Date(row.invite_expires_at).getTime() > now;
}

/** 공급사 초대 링크 토큰 모양(48자리 16진수) */
export const isInviteToken = (t: string) => /^[0-9a-f]{48}$/.test(t);
