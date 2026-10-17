// v1.11: DB 조회 실패 안내(자료가 없는 것과 구분). 서버 컴포넌트 — [다시 시도]는 같은 주소를 다시 여는 링크.
export function LoadErrorNotice({ what, retryHref, extra }: { what: string; retryHref: string; extra?: string }) {
  return (
    <div role="alert" className="mx-card mb-6 border-mx-danger/40 bg-mx-danger/10">
      <p className="text-sm font-bold text-[#fecdd3]">⚠️ {what}을(를) 불러오지 못했습니다</p>
      <p className="mt-1 text-xs leading-relaxed text-mx-text">
        일시적인 연결 문제일 수 있어요. 자료가 지워진 것은 아니니 잠시 후 다시 시도해 주세요.
        {extra ? <> {extra}</> : null}
      </p>
      <a href={retryHref} className="mx-btn-ghost mt-3 inline-flex">
        🔄 다시 시도
      </a>
    </div>
  );
}
