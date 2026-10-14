"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="card">
        <h1>화면을 불러오지 못했습니다.</h1>
        <p>연결 상태를 확인한 뒤 다시 시도해주세요.</p>
        <button onClick={reset}>다시 불러오기</button>
      </section>
    </main>
  );
}
