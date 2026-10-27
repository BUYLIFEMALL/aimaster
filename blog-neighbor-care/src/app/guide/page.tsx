import Link from 'next/link';
import { ProgramShell } from '../../components/ProgramShell';
import { APP_VERSION } from '../../lib/version';
export default function GuidePage() {
  const steps = [
    ['01', '확장을 연결하고 내 글을 전달해요', '내 글 연결 화면에서 확장을 설치하고 본인 블로그 ID로 연결하세요. Edge에서 본인 글 한 개를 연 뒤 확장에서 읽은 본문을 확인하고 프로그램으로 보냅니다. 글을 읽는 동의와 AI 전송 동의는 별개입니다.'],
    ['02', '프로필을 분석하고 직접 확인해요', '내 블로그 화면에서 전달한 글 1~20개를 고릅니다. AI 플랫폼을 고른 다음 해당 모델을 선택하고, 본인 키 사용료와 외부 전송에 동의한 뒤 분석하세요. 10개 미만은 잠정 초안입니다. 주제·독자·말투와 원하는 이웃 조건을 고쳐 확인본으로 저장합니다.'],
    ['03', '후보 글의 근거를 비교해요', '후보 비교에서 확인한 프로필을 고르고, 사용 권한이 있는 후보 글을 블로그당 3~5개 제공합니다. 전체 3~20개·본문 합계 60,000자 이내이며 각 글은 6,000자까지입니다. 현재는 후보 자동 검색·본문 수집을 제공하지 않습니다.'],
    ['04', '마음에 드는 후보를 저장해요', '주제 적합도와 실제 인용을 보고 후보를 고릅니다. 활동량·진정성·이웃 관계는 확인된 정보가 아닙니다. 선택 저장만 하며 신청·공감·댓글은 실행하지 않습니다. 프로필을 수정하면 기존 후보 평가의 선택을 멈춥니다.'],
  ];
  return <ProgramShell><div className="page-heading"><div className="eyebrow">GUIDE / 처음부터 따라 하기</div><h1>첫 연결부터, 근거 있는 선택까지.</h1><p>설치 → 내 글 분석 → 프로필 확인 → 후보 평가·선택 순서입니다.</p></div><div className="guide-grid"><section className="panel">{steps.map(([n, title, body]) => <div className="guide-step" key={n}><b>{n}</b><div><h2>{title}</h2><p>{body}</p></div></div>)}</section><aside className="panel"><h2>확장도 같은 이름입니다.</h2><p>AI 블로그 이웃 소통 자동화</p><a className="primary" download href="/downloads/blog-neighbor-care-extension-latest.zip">확장 프로그램 받기 · {APP_VERSION} ↗</a><p>ZIP을 풀고 Edge 확장 관리의 개발자 모드에서 ‘압축 풀린 확장 로드’로 폴더를 선택하세요.</p><Link className="secondary-link" href="/reader">설치·블로그 연결 화면 ↗</Link><div className="divider" /><h3>막혔을 때 확인하세요</h3><details open><summary>어떤 키와 모델로 실행되나요?</summary><p>선택한 플랫폼에 등록한 회원 본인 키만 사용합니다. 플랫폼을 바꾸면 그 플랫폼의 기본 모델로 바뀌므로 원하는 모델을 다시 확인하세요. 모델을 고르는 것만으로 AI를 호출하지 않습니다.</p></details><details><summary>결과가 오지 않거나 화면을 닫았어요.</summary><p>요청 번호와 이전 분석에서 결과 상태를 확인하세요. 같은 브라우저 탭에서는 요청 번호만 기억하며 본문·키·결과는 브라우저 저장소에 넣지 않습니다. 자동 재실행하지 않습니다. 실행 대기는 취소할 수 있지만 이미 실행 중인 작업을 취소하거나 과금 취소를 보장하지 않습니다.</p></details><details><summary>원문과 결과는 얼마나 보관되나요?</summary><p>원본 보관 기한을 따릅니다. 내 글은 최초 읽기 요청부터 30일이고, 파생 분석은 원본 중 가장 빠른 기한을 상속합니다. 확인·수정·재조회로 늘어나지 않습니다.</p></details><details><summary>자동으로 이웃 신청·댓글을 달아주나요?</summary><p>아직 제공하지 않습니다. 현재는 내 글 연결과 프로필·후보 평가/선택 단계입니다.</p></details></aside></div></ProgramShell>;
}
