// 회원에게 그대로 보여도 되는 오류(내부 정보·키 없음)
export class UserError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); }
}
