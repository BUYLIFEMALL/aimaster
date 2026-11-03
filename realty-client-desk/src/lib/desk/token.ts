import "server-only";
import { createHash, randomBytes } from "node:crypto";

// 접수 링크 값: 화면에는 만들 때 한 번만 보이고, DB에는 sha256 해시만 둔다(확장 연결 토큰과 같은 방식).
export function newIntakeToken(): string {
  return randomBytes(18).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
