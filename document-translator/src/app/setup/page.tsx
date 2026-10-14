import { APP_NAME, MAIN_SITE } from "@/lib/version";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return (
    <main className="auth-page">
      <section className="card">
        <p className="eyebrow">DOCUMENT TRANSLATOR</p>
        <h1>{APP_NAME}</h1>
        <p>운영 연결을 준비하고 있습니다.</p>
        <p>설정이 완료되면 AIMaster 회원 계정으로 사용할 수 있습니다.</p>
        <a className="button" href={`${MAIN_SITE}/programs`}>
          다른 프로그램 보기
        </a>
      </section>
    </main>
  );
}
