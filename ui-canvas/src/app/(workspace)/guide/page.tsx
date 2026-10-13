import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">사용 설명서</p>
        <h1>연동 & 사용 매뉴얼</h1>
        <p>처음 쓰는 분도 순서대로 따라 하면 화면 설계부터 내보내기까지 할 수 있습니다.</p>
      </div>
      <section className="card">
        <h2>1. 기본 사용 흐름</h2>
        <ol className="manual-list" style={{ marginTop: 14 }}>
          <li><strong>프로젝트 만들기</strong><p>[내 프로젝트]에서 [새 프로젝트]를 누르면 편집 화면이 열립니다. 이름은 위쪽 입력칸에서 바꿀 수 있고, 모든 변경은 자동 저장됩니다.</p></li>
          <li><strong>컴포넌트 배치</strong><p>왼쪽 [컴포넌트]에서 버튼·입력·탭 같은 요소를 고른 뒤 캔버스에서 드래그하면 그 크기로 만들어집니다. 우측 [속성]에서 글자, 색, 크기, 위치를 고칩니다.</p></li>
          <li><strong>레이어·그룹 정리</strong><p>[레이어] 탭에서 앞뒤 순서를 바꾸고, 여러 개를 선택한 뒤 <code>Ctrl+G</code>로 묶습니다. 컨테이너는 우클릭 메뉴에서 잠글 수 있습니다.</p></li>
          <li><strong>AI로 시작하기 (선택)</strong><p>[이미지로 만들기]에 UI 스크린샷을 올리면 AI가 컴포넌트와 디자인 명세를 만들어 줍니다. 적용 전에 결과를 확인하는 창이 나타나며, 적용 후에도 <code>Ctrl+Z</code>로 되돌릴 수 있습니다.</p></li>
          <li><strong>내보내기</strong><p>[PNG 저장]은 화면 이미지, [컴포넌트 JSON]은 편집 데이터, [명세 JSON]은 앱 이름·설명이 포함된 개발 전달용 파일입니다. JSON은 [불러오기]로 다시 열 수 있습니다.</p></li>
        </ol>
      </section>
      <section className="card" style={{ marginTop: 20 }}>
        <h2>2. Gemini API 키 등록 (AI 기능을 쓸 때만)</h2>
        <ol className="manual-list" style={{ marginTop: 14 }}>
          <li><strong>Google AI Studio 접속</strong><p><code>aistudio.google.com/apikey</code>에 본인 Google 계정으로 로그인합니다.</p></li>
          <li><strong>API 키 만들기</strong><p>[Create API key]를 눌러 키를 만들고 <code>AIza…</code>로 시작하는 값을 복사합니다.</p></li>
          <li><strong>이 프로그램에 등록</strong><p>왼쪽 [API키등록·플랫폼연동]에서 키를 붙여 넣고 [키 등록]을 누릅니다. 키는 본인 계정에서만 사용됩니다.</p></li>
        </ol>
        {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (팝업)" /></div>}
      </section>
      <section className="card" style={{ marginTop: 20 }}>
        <h2>3. 단축키</h2>
        <ul className="uc-help" style={{ marginTop: 12 }}>
          <li><code>Ctrl+Z</code> 실행 취소 · <code>Ctrl+Shift+Z</code> 다시 실행</li>
          <li><code>Ctrl+D</code> 복제 · <code>Delete</code> 삭제 · <code>Esc</code> 선택/도구 해제</li>
          <li><code>Ctrl+G</code> 그룹 · <code>Ctrl+Shift+G</code> 그룹 해제</li>
          <li>방향키 1px 이동 · <code>Shift</code>+방향키 10px 이동 · 텍스트 더블클릭 글자 수정</li>
        </ul>
      </section>
    </>
  );
}
