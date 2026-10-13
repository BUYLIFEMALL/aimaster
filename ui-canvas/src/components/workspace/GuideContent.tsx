"use client";
import {
  Copy, Download, FileJson, FileText, FolderOpen, Group, HelpCircle, ImagePlus, Lock, Moon, Redo2, Sparkles, Trash2, Undo2,
} from "lucide-react";
import { TOOLBOX } from "@/lib/canvas/constants";
import { TOOL_ICONS } from "@/components/canvas/Panels";
import { GuideLinkButton } from "./GuideLinkButton";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="gd-step">
      <span className="gd-num">{n}</span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="gd-kbd">{children}</kbd>;
}

export function GuideContent({ geminiGuideUrl }: { geminiGuideUrl: string | null }) {
  return (
    <div className="gd">
      <nav className="gd-toc card" aria-label="목차">
        <strong>바로가기</strong>
        <a href="#quick">① 3분 시작하기</a>
        <a href="#screen">② 화면 구성</a>
        <a href="#parts">③ 컴포넌트 24종</a>
        <a href="#howto">④ 자주 하는 작업</a>
        <a href="#buttons">⑤ 위쪽 버튼 설명</a>
        <a href="#ai">⑥ AI 기능과 키 등록</a>
        <a href="#files">⑦ 저장·내보내기·불러오기</a>
        <a href="#keys">⑧ 단축키</a>
        <a href="#faq">⑨ 막힐 때(FAQ)</a>
      </nav>

      <section id="quick" className="card">
        <h2>① 3분 시작하기</h2>
        <p className="gd-lead">프로그램 주소로 들어가면 빈 캔버스(하얀 작업판)가 바로 열립니다. 아래 순서대로 따라 해 보세요.</p>
        <ol className="gd-steps">
          <Step n={1} title="왼쪽에서 만들고 싶은 요소를 고릅니다">
            왼쪽 [컴포넌트] 탭의 네모 칸 중 하나를 누릅니다. 예) <b>버튼</b>. 누르면 파랗게 표시되고, 캔버스 위에 “드래그해 만들기” 안내가 나타납니다.
          </Step>
          <Step n={2} title="캔버스에서 마우스를 끌어 크기를 정합니다">
            하얀 작업판 위에서 마우스 왼쪽 버튼을 누른 채로 대각선으로 끌었다 놓으면, 그 크기의 버튼이 만들어집니다.
          </Step>
          <Step n={3} title="오른쪽 [속성]에서 글자·색을 바꿉니다">
            만든 요소를 누르면 오른쪽에 [속성] 패널이 열립니다. 이름, 글자, 배경색, 테두리를 고칠 수 있고, 미리 만들어 둔 [스타일 프리셋] 버튼으로 한 번에 모양을 바꿀 수도 있습니다.
          </Step>
          <Step n={4} title="요소를 더 만들고 위치를 맞춥니다">
            같은 방법으로 입력 필드, 탭, 카드 등을 추가합니다. 요소를 끌면 이동하고, 선택한 요소의 오른쪽 아래 파란 점을 끌면 크기가 바뀝니다.
          </Step>
          <Step n={5} title="완성되면 내보냅니다">
            위쪽 [이미지로 저장]은 그림 파일, [컴포넌트 JSON]·[명세 JSON]은 개발자에게 전달할 데이터 파일입니다. 작업 내용은 자동 저장되므로 따로 저장 버튼을 누를 필요가 없습니다.
          </Step>
        </ol>
        <p className="gd-tip">💡 처음에는 <b>[이미지로 만들기]</b>로 마음에 드는 앱 화면 캡처를 올려 보세요. AI가 요소를 자동으로 배치해 주어 시작이 훨씬 빠릅니다. (본인 Gemini 키 필요 — ⑥ 참고)</p>
      </section>

      <section id="screen" className="card">
        <h2>② 화면 구성</h2>
        <p className="gd-lead">화면은 크게 네 구역입니다. 각 구역이 무엇을 하는지만 알면 됩니다.</p>
        <div className="gd-map" aria-hidden>
          <div className="gd-map-top">A 위쪽 도구줄</div>
          <div className="gd-map-body">
            <div className="gd-map-left">B 왼쪽<br />컴포넌트 · 레이어</div>
            <div className="gd-map-center">C 가운데 캔버스<br /><small>(요소를 놓는 하얀 작업판)</small></div>
            <div className="gd-map-right">D 오른쪽<br />속성 · 명세</div>
          </div>
        </div>
        <ul className="gd-list">
          <li><b>A 위쪽 도구줄</b> — 프로젝트 이름, 저장 상태, 되돌리기, AI로 만들기, 불러오기, 내보내기 버튼이 있습니다.</li>
          <li><b>B 왼쪽</b> — [컴포넌트] 탭은 만들 수 있는 요소 목록, [레이어] 탭은 지금 놓인 요소의 목록(앞뒤 순서 조절)입니다.</li>
          <li><b>C 가운데 캔버스</b> — 실제로 요소를 놓고 편집하는 작업판입니다. 위쪽 줄에서 캔버스 크기(데스크톱/태블릿/모바일), 배율, 배경 밝기를 바꿉니다.</li>
          <li><b>D 오른쪽</b> — 요소를 선택하면 [속성](글자·색·크기·위치), 아무것도 선택하지 않으면 [명세](앱 이름·설명)가 나옵니다.</li>
        </ul>
      </section>

      <section id="parts" className="card">
        <h2>③ 컴포넌트 24종 — 언제 쓰나요?</h2>
        <p className="gd-lead">“컴포넌트”는 화면을 이루는 부품입니다. 레고 블록처럼 골라서 쌓는다고 생각하세요.</p>
        <div className="gd-parts">
          {TOOLBOX.map((t) => {
            const Icon = TOOL_ICONS[t.type];
            return (
              <div key={t.type} className="gd-part">
                <span className="gd-part-icon"><Icon size={20} /></span>
                <div><strong>{t.label}</strong><small>{t.tip}</small></div>
              </div>
            );
          })}
          <div className="gd-part">
            <span className="gd-part-icon"><Group size={20} /></span>
            <div><strong>그룹</strong><small>여러 요소를 하나로 묶습니다. 요소를 2개 이상 선택하고 Ctrl+G.</small></div>
          </div>
        </div>
      </section>

      <section id="howto" className="card">
        <h2>④ 자주 하는 작업</h2>
        <div className="gd-cards">
          <article><h3>요소 옮기기</h3><p>요소를 마우스로 끌어 옮깁니다. 키보드로 살짝 옮기려면 선택 후 방향키(1칸), <Kbd>Shift</Kbd>+방향키(10칸).</p></article>
          <article><h3>크기 바꾸기</h3><p>선택하면 오른쪽 아래에 파란 점이 생깁니다. 끌거나, 오른쪽 [속성]의 너비·높이에 숫자를 입력하세요.</p></article>
          <article><h3>글자 바꾸기</h3><p>텍스트 요소는 <b>더블클릭</b>하면 바로 고칠 수 있습니다. 버튼·알림 등은 [속성]의 “텍스트” 칸에 입력합니다.</p></article>
          <article><h3>색 바꾸기</h3><p>[속성]의 “채우기 → 배경색”, “텍스트 → 색상”, “테두리 → 색상”에서 색 칸을 눌러 고르거나 <code>#2563EB</code> 같은 색 코드를 입력합니다.</p></article>
          <article><h3>모양 한 번에 바꾸기</h3><p>[속성]의 “스타일 프리셋” 버튼을 누르면 미리 만든 디자인이 즉시 적용됩니다. 버튼은 “용도”(재생·다음 등)도 고를 수 있습니다.</p></article>
          <article><h3>겹침 순서 바꾸기</h3><p>왼쪽 [레이어] 탭에서 요소를 선택하고 ⏫(맨 앞) ▲(앞) ▼(뒤) ⏬(맨 뒤) 버튼을 누릅니다. 캔버스에서 마우스 오른쪽 버튼 메뉴로도 됩니다.</p></article>
          <article><h3>여러 개 한꺼번에 선택</h3><p><Kbd>Shift</Kbd>를 누른 채 요소를 차례로 누르거나, 빈 곳에서 끌어 네모 범위로 감쌉니다.</p></article>
          <article><h3>묶기 / 풀기</h3><p>2개 이상 선택 후 <Kbd>Ctrl</Kbd>+<Kbd>G</Kbd>로 그룹, 그룹을 선택하고 <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>G</Kbd>로 해제합니다. 묶은 요소는 함께 움직입니다.</p></article>
          <article><h3>복제 · 삭제</h3><p>선택 후 <Kbd>Ctrl</Kbd>+<Kbd>D</Kbd>로 복제, <Kbd>Delete</Kbd>로 삭제합니다. 잘못 지워도 <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>로 되돌릴 수 있습니다.</p></article>
          <article><h3>움직이지 않게 잠그기</h3><p>컨테이너를 마우스 오른쪽 버튼으로 눌러 [잠금]을 고르면 배경판처럼 고정되어 실수로 움직이지 않습니다.</p></article>
          <article><h3>캔버스 크기 바꾸기</h3><p>캔버스 위쪽 줄의 [캔버스]에서 데스크톱·태블릿·모바일 크기를 고릅니다. 배율은 화면 보기용이라 결과 파일에는 영향이 없습니다.</p></article>
          <article><h3>이름·설명 적기</h3><p>[속성]의 “이름”과 “설명”에 역할을 적어 두면 개발자가 화면을 이해하기 쉽고, AI 명세 작성에도 활용됩니다.</p></article>
        </div>
      </section>

      <section id="buttons" className="card">
        <h2>⑤ 위쪽 버튼 설명</h2>
        <div className="gd-btns">
          <div><span><Undo2 size={16} /><Redo2 size={16} /></span><p><b>되돌리기 / 다시 실행</b> — 방금 한 작업을 취소하거나 다시 적용합니다.</p></div>
          <div><span><ImagePlus size={16} /></span><p><b>이미지로 만들기</b> — 앱 화면 캡처를 올리면 AI가 요소와 명세를 만들어 줍니다. 적용 전 확인 창이 나옵니다.</p></div>
          <div><span><FolderOpen size={16} /></span><p><b>불러오기</b> — 이전에 저장한 JSON 파일을 열어 현재 캔버스에 적용합니다.</p></div>
          <div><span><FileJson size={16} /></span><p><b>컴포넌트 JSON</b> — 요소 데이터만 담은 파일. 다시 불러와 계속 편집할 때 씁니다.</p></div>
          <div><span><FileText size={16} /></span><p><b>명세 JSON</b> — 앱 이름·설명·화면 설명과 요소를 함께 담은 개발 전달용 파일. 이름과 설명을 먼저 적어야 합니다.</p></div>
          <div><span><Download size={16} /></span><p><b>이미지로 저장</b> — 캔버스를 그림 파일로 저장합니다. 공유·보고서에 붙일 때 씁니다.</p></div>
          <div><span><Moon size={16} /></span><p><b>밝은/어두운 배경</b> — 캔버스 바탕색만 바꿉니다(요소 색은 그대로).</p></div>
          <div><span><HelpCircle size={16} /></span><p><b>도움말</b> — 핵심 사용법을 빠르게 보여줍니다.</p></div>
        </div>
      </section>

      <section id="ai" className="card">
        <h2>⑥ AI 기능과 키 등록</h2>
        <p className="gd-lead">AI 기능은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 키가 없어도 편집·저장·내보내기는 모두 사용할 수 있습니다.</p>
        <h3>AI가 해 주는 일</h3>
        <ul className="gd-list">
          <li><Sparkles size={14} /> <b>AI로 내용 채우기</b> — 오른쪽 [명세] 탭에서 누르면, 캔버스에 놓인 요소를 보고 앱 이름·상세 설명·화면 설명을 써 줍니다. 요소가 1개 이상 있어야 합니다.</li>
          <li><ImagePlus size={14} /> <b>이미지로 만들기</b> — 앱 화면 캡처(PNG·JPG·WEBP)를 올리면 요소 배치와 명세를 자동으로 만듭니다.</li>
        </ul>
        <h3>잘 되게 하는 팁</h3>
        <ul className="gd-list">
          <li>글자가 또렷한 화면 캡처 한 장을 쓰세요. 한 화면에 요소가 너무 많으면 큰 덩어리부터 인식합니다.</li>
          <li>AI가 만든 결과는 완벽하지 않을 수 있으니, 만든 뒤 위치·글자를 직접 다듬으세요.</li>
          <li>결과가 마음에 들지 않으면 <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>로 이전 상태로 돌아갈 수 있습니다.</li>
        </ul>
        <h3>키 등록 3단계</h3>
        <ol className="gd-steps">
          <Step n={1} title="Google AI Studio에서 키 만들기">
            <code>aistudio.google.com/apikey</code>에 본인 Google 계정으로 로그인한 뒤 [Create API key]를 눌러 <code>AIza…</code>로 시작하는 키를 복사합니다.
          </Step>
          <Step n={2} title="이 프로그램에 등록">
            왼쪽 메뉴 [API키등록·플랫폼연동]을 열고 키를 붙여 넣은 뒤 [키 등록]을 누릅니다.
          </Step>
          <Step n={3} title="등록 확인">
            “등록됨”과 키 앞뒤 일부가 보이면 완료입니다. 키는 본인 계정에서만 사용되며, 언제든 삭제·교체할 수 있습니다.
          </Step>
        </ol>
        {geminiGuideUrl && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={geminiGuideUrl} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
        <p className="gd-tip">ℹ️ 사용 요금·한도는 본인 Google 계정에 적용됩니다. 무료 한도 안에서는 비용이 들지 않을 수 있습니다.</p>
      </section>

      <section id="files" className="card">
        <h2>⑦ 저장 · 내보내기 · 불러오기</h2>
        <h3>자동 저장</h3>
        <p>변경하면 약 1~2초 뒤 자동으로 서버에 저장됩니다. 위쪽 이름 옆 문구로 상태를 알 수 있습니다.</p>
        <div className="gd-table">
          <div><b>저장됨</b><span>모든 변경이 저장되었습니다.</span></div>
          <div><b>저장 대기 / 저장 중…</b><span>잠시 후 자동으로 저장됩니다. 이 상태에서 창을 닫으면 경고가 나옵니다.</span></div>
          <div><b>저장 실패</b><span>인터넷 연결 문제입니다. 자동으로 다시 시도하니 연결을 확인하세요.</span></div>
          <div><b>다른 창에서 먼저 저장됨</b><span>같은 프로젝트를 두 창에서 열었을 때 나옵니다. 새로고침 후 다시 작업하세요.</span></div>
        </div>
        <h3>내보내기 파일 종류</h3>
        <div className="gd-table">
          <div><b>PNG 이미지</b><span>캔버스 모습 그대로의 그림 파일. 공유·문서 첨부용.</span></div>
          <div><b>컴포넌트 JSON</b><span>요소 데이터만. 다시 불러와 이어서 편집하거나 다른 프로그램과 주고받을 때.</span></div>
          <div><b>명세 JSON</b><span>앱 이름·설명·화면 설명 + 요소. 개발자·AI 코딩 도구에 전달할 때.</span></div>
        </div>
        <h3>불러오기</h3>
        <p>[불러오기]로 위 JSON 파일을 열 수 있습니다(여러 개 동시 선택 가능). 현재 캔버스에 내용이 있으면 바꿀지 먼저 물어보며, 바꾼 뒤에도 <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>로 되돌릴 수 있습니다. 이 프로그램에서 저장한 파일이 아니면 “지원하지 않는 형식”이라고 알려 줍니다.</p>
        <h3>프로젝트 관리</h3>
        <p>에디터 왼쪽 위 [← 목록]에서 프로젝트 목록을 열어 새 프로젝트를 만들거나 삭제할 수 있습니다. 프로젝트는 최대 100개까지 저장됩니다.</p>
      </section>

      <section id="keys" className="card">
        <h2>⑧ 단축키</h2>
        <div className="gd-table">
          <div><b><Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd></b><span>실행 취소</span></div>
          <div><b><Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>Z</Kbd></b><span>다시 실행</span></div>
          <div><b><Kbd>Ctrl</Kbd>+<Kbd>D</Kbd></b><span>선택한 요소 복제</span></div>
          <div><b><Kbd>Delete</Kbd></b><span>선택한 요소 삭제</span></div>
          <div><b><Kbd>Ctrl</Kbd>+<Kbd>G</Kbd></b><span>그룹으로 묶기</span></div>
          <div><b><Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>G</Kbd></b><span>그룹 해제</span></div>
          <div><b>방향키 / <Kbd>Shift</Kbd>+방향키</b><span>1칸 / 10칸 이동</span></div>
          <div><b><Kbd>Shift</Kbd>+클릭</b><span>여러 개 선택</span></div>
          <div><b><Kbd>Esc</Kbd></b><span>도구·선택 해제</span></div>
          <div><b>더블클릭(텍스트)</b><span>글자 직접 수정</span></div>
          <div><b>마우스 오른쪽 버튼</b><span>순서·그룹·잠금·복제·삭제 메뉴</span></div>
        </div>
        <p className="gd-tip">Mac에서는 <Kbd>Ctrl</Kbd> 대신 <Kbd>⌘</Kbd>를 사용합니다.</p>
      </section>

      <section id="faq" className="card">
        <h2>⑨ 막힐 때 (자주 묻는 질문)</h2>
        <div className="gd-faq">
          <details><summary>요소가 만들어지지 않아요.</summary><p>왼쪽에서 컴포넌트를 먼저 눌러 파랗게 만든 뒤, 캔버스에서 <b>대각선으로 충분히 길게</b> 끌어야 합니다(가로·세로 5칸 이상). 그냥 클릭만 하면 만들어지지 않습니다. 취소하려면 <Kbd>Esc</Kbd>.</p></details>
          <details><summary>요소가 선택이나 이동이 안 돼요.</summary><p>잠긴 컨테이너일 수 있습니다. 마우스 오른쪽 버튼 → [잠금 해제]를 누르세요. 그룹 안의 요소는 그룹 전체로 선택되니 먼저 [그룹 해제]를 하세요.</p></details>
          <details><summary>AI 버튼을 누르면 키를 등록하라고 해요.</summary><p>본인 Gemini 키가 아직 없는 경우입니다. ⑥의 3단계대로 [API키등록·플랫폼연동]에서 키를 등록하세요.</p></details>
          <details><summary>“키가 올바르지 않다”는 메시지가 나와요.</summary><p>키를 복사할 때 앞뒤 공백이 들어갔거나 다른 값이 들어갔을 수 있습니다. 설정에서 키를 다시 붙여 넣어 등록하세요. Google AI Studio에서 키가 삭제되지 않았는지도 확인하세요.</p></details>
          <details><summary>“사용 한도를 초과했다”는 메시지가 나와요.</summary><p>본인 Google 계정의 Gemini 사용 한도가 찬 경우입니다. 잠시 후 다시 시도하거나 Google AI Studio에서 한도를 확인하세요.</p></details>
          <details><summary>이미지로 저장이 안 돼요.</summary><p>이미지 컴포넌트에 외부 사이트 주소를 넣었을 때 해당 사이트가 막으면 저장되지 않을 수 있습니다. 이미지 주소를 바꾸거나, 이미지 컴포넌트를 빼고 저장해 보세요.</p></details>
          <details><summary>불러오기가 안 돼요.</summary><p>이 프로그램의 [컴포넌트 JSON] 또는 [명세 JSON]으로 저장한 파일만 읽을 수 있습니다. 파일을 편집기로 열어 내용이 깨지지 않았는지 확인하세요.</p></details>
          <details><summary>작업한 내용이 사라졌어요.</summary><p>[← 목록]에서 다른 프로젝트를 열었을 수 있습니다. 목록에서 프로젝트 이름과 수정 시간을 확인하세요. 방금 한 작업은 <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>로 되돌릴 수 있습니다.</p></details>
          <details><summary>화면이 너무 커서 다 안 보여요.</summary><p>캔버스 위쪽 줄 [배율]을 75%·50%로 줄이거나 [캔버스]를 더 작은 크기로 바꾸세요.</p></details>
        </div>
      </section>
    </div>
  );
}
