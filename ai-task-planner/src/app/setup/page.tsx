import { APP_NAME, MAIN_SITE } from "@/lib/version";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <main className="welcome"><section className="card"><p className="eyebrow">AIMaster</p><h1>{APP_NAME}</h1><p>프로그램을 준비하고 있습니다. 로그인 연결과 회원별 기록 저장 준비를 완료한 뒤 이용할 수 있습니다.</p><a className="button primary" href={`${MAIN_SITE}/programs`}>다른 프로그램 보기</a></section></main>; }
