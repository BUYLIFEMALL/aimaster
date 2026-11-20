// 2026-11-20 IMPROVEMENTS #9: 대시보드에서 확장이 붙었는지 바로 알 수 있게, 회원 본인 연결 코드의 최근 사용 시각을 한 줄로 보여 준다.
// 값은 서버가 회원 본인 권한(RLS)으로 읽은 personal_access_tokens(이 프로그램·폐기 안 됨)에서만 온다. 새 조회·저장 없음.
export type ExtensionLinkStatus = { tokenCount: number; lastUsedAt: string | null };

export function extensionLinkLabel(status: ExtensionLinkStatus | null | undefined): { text: string; connected: boolean } {
  if (!status || !Number.isFinite(status.tokenCount) || status.tokenCount <= 0) {
    return { text: "확장 연결 전입니다. 설정에서 「확장 프로그램 바로 연결」을 눌러 주세요.", connected: false };
  }
  const used = status.lastUsedAt ? new Date(status.lastUsedAt) : null;
  if (!used || !Number.isFinite(used.getTime())) {
    return { text: "연결 코드는 있지만 확장이 아직 사용하지 않았습니다. 확장 사이드패널을 열어 연결을 확인해 주세요.", connected: false };
  }
  return { text: `확장 연결됨 · 최근 사용 ${used.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`, connected: true };
}
