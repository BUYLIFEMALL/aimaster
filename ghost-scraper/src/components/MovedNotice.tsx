// 2026-10-21 병합 A: Website Scraper는 웹 크롤링 자동화 「🔎 한 페이지 분석」으로 합쳐졌다. 이 앱은 안내만 한다(주소 유지).
export const NEW_URL = "https://web-crawler-saas.buylife.xyz/inspect";

export function MovedNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mx-bg px-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-mx-border bg-mx-surface p-6 text-center">
        <p className="text-3xl">🔎</p>
        <h1 className="text-lg font-bold text-mx-text">Website Scraper가 「웹 크롤링 자동화」로 옮겨졌습니다</h1>
        <p className="text-sm leading-relaxed text-mx-muted">
          페이지 분석(7개 탭)·화면 영역 직접 선택·AI 목록 표·CSV·이미지 ZIP 기능은 이제 <strong className="text-mx-text">웹 크롤링 자동화 → 🔎 한 페이지 분석</strong>에서 그대로 쓰실 수 있습니다.
          여러 페이지 반복 수집·엑셀 받기도 같은 곳에서 됩니다. 사용 권한도 함께 옮겨 드렸습니다.
        </p>
        <a href={NEW_URL} className="inline-block rounded-lg bg-mx-accent px-5 py-2.5 text-sm font-bold text-black hover:opacity-90">한 페이지 분석으로 가기</a>
        <p className="text-xs text-mx-muted">AI 키는 웹 크롤링 자동화 「API키등록·플랫폼연동」에서 본인 키를 쓰며, 서버에서만 사용합니다.</p>
      </div>
    </main>
  );
}
