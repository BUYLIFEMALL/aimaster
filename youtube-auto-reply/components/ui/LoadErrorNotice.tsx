// 2026-10-17 v1.10 (#13): DB 조회 실패를 "데이터 없음" 화면과 구분해서 안내한다.
export function LoadErrorNotice({ what }: { what: string }) {
  return (
    <div className="yt-card border border-yt-red/40 py-10 text-center">
      <div className="mb-3 text-4xl">⚠️</div>
      <p className="text-sm font-semibold text-yt-text">{what}을(를) 불러오지 못했어요.</p>
      <p className="mt-1 text-sm text-yt-muted">잠시 후 새로고침해 주세요. 계속되면 관리자에게 알려주세요.</p>
    </div>
  );
}
