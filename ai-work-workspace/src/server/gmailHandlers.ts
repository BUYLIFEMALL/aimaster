// E4 Gmail 서버 명령 4개(WS-20261117-25, PLAN_20261117_E4_GMAIL_F03_A2 §9) — 기능 스위치(gmailEnabled) 꺼짐이 기본.
// - 회원은 ctx.userId만(본문의 userId 등은 무시). 입력은 형식 검사 뒤 gmailInbox.ts 서버 함수로.
// - Gmail 오류는 공용 runRpc가 code를 전달하지 못하므로(5xx면 일반 문구로 바뀌어 unknown·server 구분 불가) 200 + 봉투로 돌려준다:
//   성공 { ok: true, ... } / 실패 { ok: false, code, message } — code는 허용 목록만, message는 **이 파일의 고정 한국어 문구만**(원래 오류 문구·추가 필드 복사 0).
// - GmailError가 아닌 예외(QA040)는 던지지 않고 고정 봉투로 바꾼다: 넣기·끊기 unknown(이미 처리됐을 수 있음), 읽기 server. 기록은 명령 이름만 담은 고정 한 줄(원문·cause·stack 0).
// - 꺼짐이면 각 명령이 Gmail 저장소·구글·OAuth 호출 전에 { ok: false, code: "off" }. 공통 /api/rpc 전처리(권한 확인·AI 키 읽기·모델 목록 준비·회원 확인)는 이 확인보다 먼저 그대로 실행된다(보장 범위 아님).
import "server-only";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { addGmailToInbox, disconnectGmail, GMAIL_ADD_MESSAGES, GmailError, gmailStatus, listGmailInbox, type GmailErrorCode } from "./gmailInbox";

type Handler = (ctx: Ctx, input: any) => unknown;
type Cmd = "status" | "list" | "add" | "disconnect";

const CODES: readonly GmailErrorCode[] = ["off", "auth", "bad_request", "forbidden", "conflict", "not_found", "server", "unknown"];
/** 명령별 고정 문구(서버 원문 노출 0) */
const COMMON: Record<GmailErrorCode, string> = {
  off: "Gmail 가져오기는 아직 꺼져 있습니다.",
  auth: "Gmail 연결이 만료됐거나 구글 앱 키가 바뀌었습니다. 「Gmail 연결」을 다시 눌러 주세요.",
  bad_request: "요청 내용이 올바르지 않습니다. 목록을 새로 열어 주세요.",
  forbidden: "Gmail API가 꺼져 있거나 권한이 없습니다. 구글 클라우드에서 「Gmail API」를 사용 설정해 주세요.",
  conflict: "Gmail 연결 또는 받은 업무 상태가 바뀌었습니다. 목록을 새로 열어 다시 확인해 주세요.", // 계정 변경 단정 0(conflict는 연결 변경·연결 줄 2개 모두에 쓰임)
  not_found: "Gmail 연결이나 그 메일을 찾지 못했습니다. 목록을 새로 열어 주세요.",
  server: "Gmail 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  unknown: "Gmail 요청 결과를 확인하지 못했습니다. 잠시 뒤 다시 확인해 주세요.",
};
const messageFor = (cmd: Cmd, code: GmailErrorCode): string =>
  cmd === "add" && (code === "conflict" || code === "server" || code === "unknown") ? GMAIL_ADD_MESSAGES[code] : COMMON[code];

/** QA040: 예상 밖 예외(GmailError 아님)의 고정 결과 — 넣기·끊기는 이미 처리됐을 수 있어 「결과 모름」, 읽기는 「처리 못 함」 */
const UNEXPECTED: Record<Cmd, GmailErrorCode> = { status: "server", list: "server", add: "unknown", disconnect: "unknown" };
const DISCONNECT_UNKNOWN = "연결을 끊었는지 확인하지 못했습니다. 화면을 새로고침해 연결 상태를 확인해 주세요.";

async function envelope<T extends object>(cmd: Cmd, fn: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; code: GmailErrorCode; message: string }> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof GmailError && CODES.includes(e.code)) return { ok: false, code: e.code, message: messageFor(cmd, e.code) };
    // QA040 P2: 예상 밖 예외를 다시 던지면 공용 runRpc가 console.error(원문 e)로 기록 → 원문(토큰·메일 등)이 서버 로그에 남음.
    // 그래서 여기서 고정 봉투로 바꾸고, 기록도 명령 이름만 담은 고정 한 줄(e·cause·stack·추가 칸 0).
    console.error(`[gmail] ${cmd} unexpected error`);
    const code = UNEXPECTED[cmd];
    return { ok: false, code, message: cmd === "disconnect" ? DISCONNECT_UNKNOWN : messageFor(cmd, code) };
  }
}
const bad = (cmd: Cmd) => ({ ok: false as const, code: "bad_request" as const, message: messageFor(cmd, "bad_request") });
const str = (v: unknown, max: number) => (typeof v === "string" && v.length >= 1 && v.length <= max ? v : null);
function member(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError("Unauthorized", 401);
  return ctx.userId;
}

export const gmailHandlers: Record<string, Handler> = {
  async gmailStatus(ctx) {
    const userId = member(ctx);
    return envelope("status", () => gmailStatus(userId));
  },
  async gmailList(ctx, input) {
    const userId = member(ctx);
    const expectSub = str(input?.expectSub, 255);
    if (!expectSub) return bad("list");
    return envelope("list", () => listGmailInbox(userId, expectSub));
  },
  async gmailAdd(ctx, input) {
    const userId = member(ctx);
    const messageId = str(input?.messageId, 64);
    const title = str(input?.title, 400); // 앞뒤 공백 제거 뒤 1~200자 검사는 서버 함수
    const expectSub = str(input?.expectSub, 255);
    if (!messageId || !title || !expectSub) return bad("add");
    return envelope("add", () => addGmailToInbox(userId, { messageId, title, expectSub }));
  },
  async gmailDisconnect(ctx) {
    const userId = member(ctx);
    return envelope("disconnect", async () => {
      await disconnectGmail(userId);
      return {};
    });
  },
};
