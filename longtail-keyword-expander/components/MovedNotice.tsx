// 2026-10-23 마케팅 병합 A(v1.11): 롱테일 키워드분석 자동화는 키워드·경쟁사 분석 자동화 「🌱 키워드 확장」으로 합쳐졌다.
// 이 앱은 안내만 한다(주소 유지). 씨드 키워드·최근 30일 결과·텔레그램 연결은 같은 DB라 새 앱에서 그대로 보인다.
export const NEW_URL = "https://competitor-analysis.buylife.xyz/expand";
export const MOVED_MESSAGE = "롱테일 키워드분석 자동화는 키워드·경쟁사 분석 자동화 「🌱 키워드 확장」으로 옮겨졌습니다.";

export function MovedNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-card w-full max-w-lg space-y-4 text-center">
        <p className="text-4xl">🌱</p>
        <h1 className="text-lg font-black text-mx-text">롱테일 키워드분석이 「키워드·경쟁사 분석 자동화」로 옮겨졌습니다</h1>
        <p className="text-sm leading-relaxed text-mx-muted">
          연관·롱테일 키워드 확장, 관련도 점수, 블로그 작업 지시문, CSV, 텔레그램 알림은 이제{" "}
          <strong className="text-mx-text">키워드·경쟁사 분석 자동화 → 🌱 키워드 확장</strong>에서 그대로 쓰실 수 있습니다.
          넓힌 키워드로 바로 경쟁사 분석까지 한 곳에서 이어집니다.
        </p>
        <a href={NEW_URL} className="mx-btn-primary inline-flex">
          키워드 확장으로 가기
        </a>
        <p className="text-xs text-mx-muted">
          등록한 씨드 키워드, 최근 30일 안의 확장 결과, 연결한 텔레그램 봇, 본인 SerpApi·OpenAI 키를 그대로 이어서 씁니다. 다시 등록하지 않아도 됩니다.
        </p>
      </div>
    </main>
  );
}
