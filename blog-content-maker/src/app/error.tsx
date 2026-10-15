"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="welcome"><div className="card"><h1>화면을 열지 못했습니다</h1><p>잠시 후 다시 시도해 주세요. 문제가 계속되면 메인 사이트에서 로그인과 이용 권한을 확인해 주세요.</p><div className="actions"><button onClick={reset}>다시 시도</button><a className="button" href="https://www.buylife.xyz/programs">다른 프로그램 보기</a></div></div></main>; }
