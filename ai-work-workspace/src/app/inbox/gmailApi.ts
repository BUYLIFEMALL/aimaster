"use client";
// E4 Gmail 패널용 서버 명령 묶음(WS-20261117-25, PLAN §9) — 받은 업무 화면이 연 계정(accountKey)을 4개 명령 모두에 기대 계정으로 실어 보냄.
// 오류 변환(패널 GmailPanelError):
// - 로그인 계정 바뀜(서버 409 AccountChanged) → account_changed  ※ 일반 Gmail conflict(200 봉투)와 섞지 않음
// - 로그인 끊김(401) → auth(명령 전 거절이라 실행 0)
// - 200 봉투 { ok: false, code } → 허용 code만, 문구는 이 파일의 고정 문구
// - 그 밖(네트워크 실패·5xx·JSON 아님·모양 이상·모르는 code): 넣기(add)는 **결과 모름**(code 없음 → 자동 재전송 0·성공 단정 0), 나머지는 server
// - 계정 id가 비면 보내기 전에 account_changed(요청 0).
import { AccountChangedError, RELOGIN_MESSAGE, rpc } from "@/lib/standaloneRpc";
import type { GmailPanelApi, GmailPanelError, GmailPanelErrorCode, GmailPanelItem } from "./GmailInboxPanel";

const SERVER_CODES: readonly GmailPanelErrorCode[] = ["off", "auth", "bad_request", "forbidden", "conflict", "not_found", "server", "unknown"];
const MESSAGES: Partial<Record<GmailPanelErrorCode, string>> = {
  off: "Gmail 가져오기는 아직 꺼져 있습니다.",
  auth: "Gmail 연결이 만료됐거나 구글 앱 키가 바뀌었습니다. 「Gmail 연결」을 다시 눌러 주세요.",
  bad_request: "요청 내용이 올바르지 않습니다. 목록을 새로 열어 주세요.",
  forbidden: "Gmail API가 꺼져 있거나 권한이 없습니다. 구글 클라우드에서 「Gmail API」를 사용 설정해 주세요.",
  conflict: "Gmail 연결 또는 받은 업무 상태가 바뀌었습니다. 목록을 새로 열어 다시 확인해 주세요.",
  not_found: "Gmail 연결이나 그 메일을 찾지 못했습니다. 목록을 새로 열어 주세요.",
  server: "Gmail 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  unknown: "받은 업무에 넣었는지 확인하지 못했습니다. 이미 넣어졌을 수 있으니 받은 업무 목록에서 확인해 주세요.",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const err = (code: GmailPanelErrorCode | undefined, message?: string): GmailPanelError => (code ? { code, message: message ?? MESSAGES[code] } : {});
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strOrNull = (v: unknown) => v === null || typeof v === "string";

export function boundGmailApi(accountKey: string | null | undefined): GmailPanelApi {
  const call = async (name: string, body: Record<string, unknown>, isAdd: boolean): Promise<Record<string, unknown>> => {
    if (typeof accountKey !== "string" || !accountKey.trim()) throw err("account_changed");
    let r: unknown;
    try {
      r = await rpc<unknown>(name, body, { expectedAccount: accountKey });
    } catch (e) {
      if (e instanceof AccountChangedError) throw err("account_changed");
      if (e instanceof Error && e.message === RELOGIN_MESSAGE) throw err("auth", RELOGIN_MESSAGE);
      throw isAdd ? err(undefined) : err("server"); // 네트워크·5xx·JSON 아님
    }
    if (!isObj(r)) throw isAdd ? err(undefined) : err("server");
    if (r.ok === true) return r;
    if (r.ok === false && typeof r.code === "string" && (SERVER_CODES as string[]).includes(r.code)) {
      const code = r.code as GmailPanelErrorCode;
      throw code === "unknown" ? err("unknown") : err(code);
    }
    throw isAdd ? err(undefined) : err("server"); // 봉투 모양 이상·모르는 code
  };
  return {
    async status() {
      const r = await call("gmailStatus", {}, false);
      if (typeof r.connected !== "boolean" || !strOrNull(r.email) || !strOrNull(r.sub)) throw err("server");
      return { connected: r.connected, email: r.email as string | null, sub: r.sub as string | null };
    },
    async list(expectSub) {
      const r = await call("gmailList", { expectSub }, false);
      const items = Array.isArray(r.items) ? r.items : null;
      if (typeof r.sub !== "string" || !strOrNull(r.email) || !items) throw err("server");
      const ok = items.every((m) => isObj(m) && typeof m.id === "string" && typeof m.subject === "string" && typeof m.from === "string" && strOrNull(m.date));
      if (!ok || items.length > 20) throw err("server");
      return { sub: r.sub, email: r.email as string | null, items: (items as Record<string, unknown>[]).map((m) => ({ id: m.id, subject: m.subject, from: m.from, date: m.date }) as GmailPanelItem) };
    },
    async add(input) {
      const r = await call("gmailAdd", { messageId: input.messageId, title: input.title, expectSub: input.expectSub }, true);
      if ((r.status !== "added" && r.status !== "existing") || typeof r.inboxId !== "string" || !UUID.test(r.inboxId)) throw err(undefined); // 성공 단정 0
      return { status: r.status, inboxId: r.inboxId };
    },
    async disconnect(expectSub) {
      // QA041: 화면이 확인한 계정만. 끊기는 쓰기라 이상 응답은 결과 모름(넣기와 같음)
      if (typeof expectSub !== "string" || !expectSub) throw err("bad_request");
      await call("gmailDisconnect", { expectSub }, true);
    },
  };
}
