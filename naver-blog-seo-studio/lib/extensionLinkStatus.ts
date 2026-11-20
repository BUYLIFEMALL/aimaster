// 2026-11-20 IMPROVEMENTS #9 · P2(Mac msg_63d4ddd16bbd): 대시보드에 「SEO 스튜디오 확장 연결 코드의 사용 기록」을 한 줄로 보여 준다.
// last_used_at은 확장이 서버를 마지막으로 부른 「과거 기록」일 뿐 지금 연결돼 있다는 뜻이 아니므로 실시간 상태처럼 표기하지 않는다.
// 조회 실패는 「코드 없음」「사용 기록 없음」과 구분한다. 값은 서버가 회원 본인 권한으로 읽은 이 프로그램 연결 코드에서만 온다.
// 2차 P2(Mac msg_a4cae4da3aef): 한 번의 조회(최신 1건)만 근거로 쓴다 — hasToken은 「1행 있음」, 개수는 화면에 쓰지 않는다.
export type ExtensionLinkStatus =
  | { state: "error" }
  | { state: "ok"; hasToken: boolean; lastUsedAt: string | null };

/** 한 번의 조회(같은 조건, last_used_at 내림차순·null 뒤·limit 1) 결과 → 상태. 오류·모양 이상은 error, 0행은 코드 없음, 1행은 그 행의 시각(없으면 null). */
export function extensionLinkFromQuery(result: { data: unknown; error: unknown } | null | undefined): ExtensionLinkStatus {
  if (!result || result.error || !Array.isArray(result.data)) return { state: "error" };
  if (result.data.length === 0) return { state: "ok", hasToken: false, lastUsedAt: null };
  const row = result.data[0] as { last_used_at?: unknown } | null;
  if (!row || typeof row !== "object") return { state: "error" };
  return { state: "ok", hasToken: true, lastUsedAt: typeof row.last_used_at === "string" ? row.last_used_at : null };
}

const SCOPE = "SEO 스튜디오 확장";

export function extensionLinkLabel(status: ExtensionLinkStatus | null | undefined): { text: string; showSettingsLink: boolean } {
  if (!status || status.state !== "ok") {
    return { text: `${SCOPE} 연결 기록을 불러오지 못했습니다. 설정 화면에서 확인해 주세요.`, showSettingsLink: true };
  }
  if (status.hasToken !== true) {
    return { text: `${SCOPE} 연결 코드가 없습니다. 설정에서 「확장 프로그램 바로 연결」을 눌러 주세요.`, showSettingsLink: true };
  }
  const used = status.lastUsedAt ? new Date(status.lastUsedAt) : null;
  if (!used || !Number.isFinite(used.getTime())) {
    return { text: `${SCOPE} 연결 코드는 있지만 아직 사용 기록이 없습니다.`, showSettingsLink: true };
  }
  return {
    text: `${SCOPE}이 마지막으로 사용된 기록: ${used.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (지금 연결 상태가 아닌 과거 기록)`,
    showSettingsLink: false,
  };
}
