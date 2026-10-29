import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { ProgramNavigation } from '../src/components/ProgramNavigation';

function Preview() {
  const [pathname, setPathname] = useState('/neighbors');
  const titles: Record<string,string> = { '/reader':'내 글 연결', '/studio':'내 블로그 분석', '/candidates':'이웃 후보 비교', '/neighbors':'이웃 관계 기록', '/settings':'API키등록·플랫폼연동', '/guide':'연동 & 사용 매뉴얼' };
  return <div onClickCapture={event => {
    const anchor = (event.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (href?.startsWith('/') && !anchor?.hasAttribute('download')) { event.preventDefault(); setPathname(href); }
  }}><PathnameContext.Provider value={pathname}><ProgramNavigation email="layout@example.invalid">
    <div className="page-heading"><div className="eyebrow">좌측 메뉴 규격 확인 · 로컬 미리보기</div><h1>{titles[pathname]}</h1><p>실제 메뉴 컴포넌트와 CSS입니다. 계정은 합성 예시이며 운영 데이터·로그인·AI 호출을 사용하지 않습니다.</p></div>
    <section className="panel"><h2>작업 순서를 따라 이동하세요.</h2><p>1. 내 글 연결 → 2. 내 블로그 분석 → 3. 이웃 후보 비교 → 4. 이웃 관계 기록</p><div className="notice">자동 소통은 꺼져 있습니다. 이 화면은 메뉴 배치와 접힘 동작을 확인하는 로컬 결과물입니다.</div></section>
    <section className="panel" style={{ marginTop:24,minHeight:1000 }}><h2>긴 본문에서도 메뉴 위치 유지</h2><p>낮은 화면에서는 메뉴 영역만 스크롤되며 계정은 마지막 메뉴 바로 아래에 이어집니다.</p></section>
  </ProgramNavigation></PathnameContext.Provider></div>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
