"use client";
import {
  CheckCircle2,
  Copy, Download, ExternalLink, FileJson, FileText, FolderOpen, Group, HelpCircle, ImagePlus, KeyRound, Lock, Moon, Redo2, ShieldCheck, Sparkles, Trash2, Undo2,
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
      {/* 4단계 파이프라인 다이어그램 카드 */}
      <section className="card" style={{ borderColor: "#2f3e5c", background: "linear-gradient(180deg, #131927 0%, #0e1422 100%)" }}>
        <p className="eyebrow" style={{ color: "#38bdf8" }}>STANDARD PROTOTYPING PIPELINE</p>
        <h2 style={{ fontSize: 20, marginTop: 4, marginBottom: 8, color: "#ffffff" }}>표준 4단계 UI 프로토타이핑 워크플로우</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
          누구나 직관적으로 따라 할 수 있는 캔버스 화면 설계 및 AI 역공학 파이프라인입니다.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
          <div style={{ background: "#161f30", border: "1px solid #283750", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                Setup & Canvas
              </span>
              <strong style={{ fontSize: 18, color: "#38bdf8" }}>01</strong>
            </div>
            <strong style={{ display: "block", fontSize: 14, color: "#ffffff", marginBottom: 6 }}>캔버스 해상도 설정</strong>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              왼쪽 패널 아래에서 데스크톱 1440×900, 노트북 1280×800, 태블릿 820×1180, 모바일 390×844 중 화면 크기를 고르고, 캔버스 배경을 어둡게·밝게 바꿉니다.
            </p>
          </div>

          <div style={{ background: "#161f30", border: "1px solid #283750", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" }}>
                Components & Layout
              </span>
              <strong style={{ fontSize: 18, color: "#a78bfa" }}>02</strong>
            </div>
            <strong style={{ display: "block", fontSize: 14, color: "#ffffff", marginBottom: 6 }}>25종 컴포넌트 드래그</strong>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              버튼, 인풋, 카드 등을 마우스 드래그로 원하는 위치에 생성하고 Shift 다중 선택 및 그룹(Ctrl+G)화합니다.
            </p>
          </div>

          <div style={{ background: "#161f30", border: "1px solid #283750", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
                Generative AI
              </span>
              <strong style={{ fontSize: 18, color: "#22d3ee" }}>03</strong>
            </div>
            <strong style={{ display: "block", fontSize: 14, color: "#ffffff", marginBottom: 6 }}>AI 스크린샷 역공학</strong>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              앱 캡처 이미지를 업로드하면 Gemini가 시각 요소를 자동 분해해 캔버스 컴포넌트로 즉시 재배치합니다.
            </p>
          </div>

          <div style={{ background: "#161f30", border: "1px solid #283750", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                Export & Code
              </span>
              <strong style={{ fontSize: 18, color: "#34d399" }}>04</strong>
            </div>
            <strong style={{ display: "block", fontSize: 14, color: "#ffffff", marginBottom: 6 }}>실측 PNG & JSON 명세</strong>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              PNG 이미지, 컴포넌트·명세 JSON, React + Tailwind 코드(.tsx)로 내보냅니다. 코드는 반응형(flex)과 캔버스 그대로(절대 위치) 중에서 고릅니다.
            </p>
          </div>
        </div>
      </section>

      {/* 최상위 보안 원칙 (BYOK) 연동 가이드 배너 */}
      <div style={{
        padding: "20px 24px",
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)",
        border: "1px solid rgba(16, 185, 129, 0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 15, color: "#ffffff" }}>최상위 보안 원칙 (회원 본인 키 독립 연동)</strong>
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.25)", color: "#34d399", fontWeight: 700 }}>BYOK Standard</span>
            </div>
            <p style={{ fontSize: 12, color: "#a7f3d0", margin: "2px 0 0" }}>
              본 프로그램의 AI 기능(이미지에서 UI 복원, 명세 자동 채우기)은 회원 본인의 Google Gemini API 키로만 동작합니다.
            </p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
          등록된 키는 본인 계정에 연결해 보관하며 본인 작업에만 사용합니다. 무료로 발급받아 등록하시면 제한 없이 UI 캔버스를 활용할 수 있습니다.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          {geminiGuideUrl && (
            <a href={geminiGuideUrl} target="_blank" rel="noreferrer" className="button" style={{ background: "#10b981", color: "#ffffff", borderColor: "#10b981", fontSize: 12, padding: "6px 14px" }}>
              <ExternalLink size={13} /> Google AI Studio 무료 키 발급
            </a>
          )}
          <a href="/settings" className="button" style={{ background: "#1e293b", color: "#ffffff", borderColor: "#334155", fontSize: 12, padding: "6px 14px" }}>
            <KeyRound size={13} style={{ color: "#38bdf8" }} /> 본인 API 키 등록하러 가기
          </a>
        </div>
      </div>

      {/* 목차 */}
      <nav className="gd-toc card" aria-label="목차">
        <strong>바로가기</strong>
        <a href="#quick">① 3분 시작하기</a>
        <a href="#screen">② 화면 구성</a>
        <a href="#parts">③ 컴포넌트 25종</a>
        <a href="#howto">④ 자주 하는 작업</a>
        <a href="#buttons">⑤ 상단 도구줄 설명</a>
        <a href="#ai">⑥ AI 기능과 키 등록</a>
        <a href="#files">⑦ 저장·내보내기·불러오기</a>
        <a href="#keys">⑧ 단축키 모음</a>
        <a href="#faq">⑨ 자주 묻는 질문(FAQ)</a>
      </nav>

      {/* 섹션 1: 3분 시작하기 */}
      <section id="quick" className="card">
        <h2>① 3분 시작하기</h2>
        <p className="gd-lead">프로그램 주소로 들어가면 빈 캔버스(작업판)가 바로 열립니다. 아래 5단계 순서대로 따라 해 보세요.</p>
        <ol className="gd-steps">
          <Step n={1} title="왼쪽 [컴포넌트] 탭에서 만들고 싶은 요소를 선택합니다">
            왼쪽 도구상자의 네모 칸 중 하나를 클릭합니다. 예) <b>버튼 (Button)</b>. 클릭하면 테두리가 파랗게 활성화되며 캔버스 위에 “드래그해 만들기” 안내가 표시됩니다.
          </Step>
          <Step n={2} title="캔버스에서 마우스를 대각선으로 끌어 크기를 정합니다">
            작업판 위에서 마우스 왼쪽 버튼을 누른 채로 대각선으로 드래그했다가 놓으면, 해당 좌표와 크기로 버튼이 즉시 생성됩니다.
          </Step>
          <Step n={3} title="오른쪽 [속성] 패널에서 텍스트와 색상을 커스텀합니다">
            생성된 요소를 클릭하면 우측 [속성] 패널이 열립니다. 라벨 문구, 폰트 크기, 배경색, 테두리 두께를 조절하거나 [스타일 프리셋]으로 원클릭 변환할 수 있습니다.
          </Step>
          <Step n={4} title="다양한 요소를 추가하고 위치를 정렬합니다">
            입력창, 카드, 탭, 차트 등을 추가합니다. 선택한 요소의 우측 하단 파란 핸들러를 끌면 크기를 미세 조절할 수 있고, 방향키로 1px씩 정밀 이동할 수 있습니다.
          </Step>
          <Step n={5} title="완성된 UI를 이미지나 JSON 명세로 내보냅니다">
            상단 [이미지로 저장]은 PNG 그림 파일, [컴포넌트 JSON]과 [명세 JSON]은 개발자에게 넘길 데이터 파일, [{"</>"} 코드]는 React + Tailwind 코드입니다. [명세 JSON]은 우측 [명세]에 앱 이름과 설명을 먼저 적어야 받을 수 있습니다. 작업은 손을 멈추고 약 1.5초 뒤 자동 저장됩니다.
          </Step>
        </ol>
        <p className="gd-tip">💡 <b>원클릭 팁</b>: 기존에 마음에 드는 앱이나 웹사이트 캡처 이미지가 있다면, 상단 <b>[이미지로 만들기]</b>를 눌러 스크린샷을 올려보세요. Gemini AI가 컴포넌트를 자동으로 분해해 캔버스에 배치해 줍니다.</p>
      </section>

      {/* 섹션 2: 화면 구성 */}
      <section id="screen" className="card">
        <h2>② 캔버스 에디터 화면 구성</h2>
        <p className="gd-lead">에디터는 크게 4대 작업 영역으로 이루어져 있습니다.</p>
        <div className="gd-map" aria-hidden>
          <div className="gd-map-top">A 상단 글로벌 도구줄 (프로젝트명, 실행취소, AI도구, 저장/내보내기)</div>
          <div className="gd-map-body">
            <div className="gd-map-left">B 좌측 패널<br /><small>25종 컴포넌트 도구상자 & 레이어 트리</small></div>
            <div className="gd-map-center">C 중앙 메인 캔버스<br /><small>(요소를 실시간 배치하는 작업 스테이지)</small></div>
            <div className="gd-map-right">D 우측 패널<br /><small>선택 속성 인스펙터 & 앱 명세서</small></div>
          </div>
        </div>
        <ul className="gd-list">
          <li><b>A 상단 글로벌 도구줄</b> — 프로젝트 제목 편집, 자동 저장 상태 인디케이터, 실행취소/다시실행, AI 역공학, 파일 가져오기 및 내보내기 버튼이 집약되어 있습니다.</li>
          <li><b>B 좌측 패널</b> — [컴포넌트] 탭에서 25종 UI 부품을 고르고, [레이어] 탭에서 화면 내 컴포넌트의 앞뒤 순서(Z-Index) 및 잠금/삭제를 제어합니다.</li>
          <li><b>C 중앙 메인 캔버스</b> — 화면 크기(데스크톱 1440×900 / 노트북 1280×800 / 태블릿 820×1180 / 모바일 390×844), 배율 줌, 어두운·밝은 배경을 지원하는 작업판입니다.</li>
          <li><b>D 우측 패널</b> — 요소를 선택하면 [속성](텍스트, 색상, 좌표, 테두리, 프리셋), 선택이 없을 때는 프로젝트 전체의 [앱 명세](이름, 목적, 화면 설명)가 표시됩니다. [AI로 내용 채우기] 버튼도 이 명세 칸에 있습니다.</li>
          <li><b>프로젝트 목록</b> — 좌측 메뉴의 대시보드에서 [새 프로젝트 생성]으로 새 캔버스를 만들고, 프로젝트마다 [열기]·[삭제]를 합니다(삭제는 되돌릴 수 없습니다). 「캔버스 디자인 시작하기」는 가장 최근 프로젝트를 바로 열고, 하나도 없으면 새로 만듭니다.</li>
        </ul>
      </section>

      {/* 섹션 3: 컴포넌트 25종 */}
      <section id="parts" className="card">
        <h2>③ 컴포넌트 25종 라이브러리</h2>
        <p className="gd-lead">레고 블록처럼 원하는 부품을 골라 드래그하면 즉시 화면이 완성됩니다.</p>
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
            <div><strong>그룹 (Group)</strong><small>2개 이상의 컴포넌트를 하나로 묶어 상대좌표로 일괄 이동·복제합니다. (Ctrl+G)</small></div>
          </div>
        </div>
      </section>

      {/* 섹션 4: 자주 하는 작업 */}
      <section id="howto" className="card">
        <h2>④ 자주 하는 작업 노하우</h2>
        <div className="gd-cards">
          <article>
            <h3>여러 요소를 한 번에 선택하기</h3>
            <p><Kbd>Shift</Kbd> 키를 누른 채 요소를 클릭하거나, 빈 캔버스에서 마우스를 드래그하여 마퀴(파란 점선 사각형) 영역 안에 넣으면 다중 선택됩니다.</p>
          </article>
          <article>
            <h3>그룹으로 묶고 풀기</h3>
            <p>요소를 2개 이상 선택하고 <Kbd>Ctrl</Kbd>+<Kbd>G</Kbd>를 누르면 그룹이 됩니다. 그룹을 선택하고 <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>G</Kbd>를 누르면 그룹이 풀려 개별 요소로 돌아옵니다.</p>
          </article>
          <article>
            <h3>화면 밖으로 나가지 않게 하기</h3>
            <p>요소를 끌다 캔버스 경계를 벗어나면 시스템이 안전 영역 안으로 자동 보정합니다. 오른쪽 속성에서 X·Y 좌표를 숫자로 직접 입력할 수도 있습니다.</p>
          </article>
          <article>
            <h3>배경 컨테이너 잠그기</h3>
            <p>카드나 모달 배경처럼 움직이지 않아야 할 요소는 레이어에서 <b>자물쇠 아이콘</b>을 누르거나 속성의 [잠금]을 켜면 드래그 선택에서 제외됩니다.</p>
          </article>
        </div>
      </section>

      {/* 섹션 5: 상단 도구줄 버튼 설명 */}
      <section id="buttons" className="card">
        <h2>⑤ 상단 도구줄 버튼 가이드</h2>
        <div className="gd-btns">
          <div><span><Undo2 size={16} /></span><div><strong>실행 취소 (Ctrl+Z)</strong><p>직전 작업을 되돌립니다. 최대 100단계까지 되돌릴 수 있습니다.</p></div></div>
          <div><span><Redo2 size={16} /></span><div><strong>다시 실행 (Ctrl+Shift+Z 또는 Ctrl+Y)</strong><p>취소했던 작업을 다시 적용합니다.</p></div></div>
          <div><span><ImagePlus size={16} /></span><div><strong>이미지로 만들기</strong><p>앱 스크린샷 이미지를 분석해 캔버스에 자동으로 배치합니다.</p></div></div>
          <div><span><FolderOpen size={16} /></span><div><strong>불러오기</strong><p>예전에 받은 JSON 파일을 열어 캔버스를 그 내용으로 바꿉니다. 바꾸기 전에 확인 창이 뜨고, Ctrl+Z로 되돌릴 수 있습니다.</p></div></div>
          <div><span><Sparkles size={16} /></span><div><strong>AI로 내용 채우기 (우측 [명세] 칸)</strong><p>요소를 아무것도 선택하지 않으면 우측에 [명세] 칸이 보이고, 그 안의 버튼을 누르면 현재 배치에 맞는 앱 이름·설명과 글자를 AI가 제안합니다. 결과를 확인 창에서 보고 적용할지 고릅니다.</p></div></div>
          <div><span><Download size={16} /></span><div><strong>이미지로 저장</strong><p>캔버스 전체를 1:1 고해상도 PNG 파일로 캡처하여 다운로드합니다.</p></div></div>
          <div><span><FileJson size={16} /></span><div><strong>컴포넌트 / 명세 JSON</strong><p>프론트엔드 개발팀에 그대로 전달할 수 있는 표준 명세서 파일입니다.</p></div></div>
          <div><span><FileJson size={16} /></span><div><strong>{"</>"} 코드</strong><p>캔버스 화면을 React + Tailwind CSS 코드 한 파일로 복사하거나 .tsx로 받습니다. 「배치 방식」에서 <b>반응형 (flex)</b>(기본, 휴대폰에서는 세로로 쌓임)과 <b>캔버스 그대로 (절대 위치)</b> 중 하나를 고릅니다. 갤러리에서 저장한 AI 컴포넌트도 여기서 다시 보고 복사·받기·삭제합니다.</p></div></div>
        </div>
      </section>

      {/* 2026-10-21 병합 D: 컴포넌트 갤러리(옛 AI 웹 UI 제작 자동화) */}
      <section id="gallery" className="card">
        <h2>🧩 컴포넌트 갤러리</h2>
        <p className="gd-lead">좌측 메뉴 [🧩 컴포넌트 갤러리]에서 예전 「AI 웹 UI 제작 자동화」의 기능을 그대로 씁니다.</p>
        <ul className="gd-list">
          <li><b>컴포넌트 갤러리·코드 라이브러리</b>: 버튼·입력·탭 등 12종 React + Tailwind 컴포넌트를 보고 TSX 코드를 복사합니다.</li>
          <li><b>인터랙티브 데모실</b>: 장바구니·업로드·미디어 재생 같은 실제 상황 10종으로 동작을 체험합니다.</li>
          <li><b>AI 컴포넌트 생성기</b>: 만들고 싶은 컴포넌트를 한 줄로 적으면 회원 본인 Gemini 키로 코드를 만들어 줍니다. 결과 아래 [캔버스 프로젝트에 저장]으로 기존 또는 새 프로젝트에 보관하고(프로젝트당 최대 50개), 그 프로젝트 편집기의 [{"</>"} 코드] → 「저장한 AI 컴포넌트」에서 다시 봅니다.</li>
          <li><b>캔버스에 놓기</b>: 「저장한 AI 컴포넌트」에서 [캔버스에 놓기]를 누르면 보이는 화면 가운데에 「🧩 AI 컴포넌트」 상자가 놓입니다. 코드로 내보낼 때 그 자리에 해당 컴포넌트를 불러오는 코드가 들어갑니다. 안전을 위해 캔버스에서는 실제 모양 대신 제목 상자로만 보여 줍니다.</li>
        </ul>
      </section>

      {/* 섹션 6: AI 기능과 키 등록 */}
      <section id="ai" className="card">
        <h2>⑥ Gemini AI 기능 활용법</h2>
        <p className="gd-lead">UI Canvas는 Google Gemini의 최신 멀티모달 비전 모델을 사용하여 시각적 프로토타이핑을 가속화합니다.</p>
        <ul className="gd-list">
          <li><b>스크린샷에서 UI 복원</b>: Figma, Dribbble, 실제 운영 중인 모바일 앱 화면을 캡처해 올리면 버튼, 카드, 헤더, 내비게이션을 정확한 좌표로 분해합니다.</li>
          <li><b>앱 명세서 자동 생성</b>: 캔버스에 배치된 컴포넌트들의 상호작용과 기능 목적을 AI가 분석하여 기획서 수준의 설명 텍스트를 작성합니다.</li>
          <li><b>연동 주의사항</b>: 회원 본인의 Gemini API 키가 공용 설정에 등록되어 있어야 동작하며, 키가 없을 경우 안내 팝업이 노출됩니다.</li>
        </ul>
      </section>

      {/* 섹션 7: 저장·내보내기·불러오기 */}
      <section id="files" className="card">
        <h2>⑦ 자동 저장 및 데이터 호환성</h2>
        <div className="gd-cards">
          <article>
            <h3>1.5초 자동 저장 (Cloud DB)</h3>
            <p>요소를 이동하거나 속성을 바꾸면 1.5초 후 Supabase 클라우드에 안전하게 저장됩니다. 상단에 '저장됨' 상태가 뜨면 언제든 브라우저를 닫아도 안전합니다.</p>
          </article>
          <article>
            <h3>JSON 프로젝트 가져오기</h3>
            <p>기존에 내보냈던 컴포넌트 JSON이나 다른 사용자가 공유한 JSON 명세를 [불러오기] 버튼으로 캔버스 위에 그대로 복원할 수 있습니다.</p>
          </article>
          <article>
            <h3>저장 상태 표시 읽는 법</h3>
            <p>상단에 「저장됨 / 저장 대기 / 저장 중… / 저장 실패 · 다시 시도합니다 / 다른 창에서 먼저 저장됨」이 표시됩니다. 같은 프로젝트를 두 창에서 열어 고치면 「다른 창에서 먼저 저장됨」이 뜨니, 한 창에서만 작업해 주세요. 저장 실패는 약 8초 뒤 자동으로 다시 시도합니다.</p>
          </article>
          <article>
            <h3>보관 기간</h3>
            <p>프로젝트는 회원님 계정에만 저장됩니다. AIMaster 공통 보관 규칙에 따라 일반 회원이 만든 자료는 저장공간 500MB 안에서 만든 날부터 30일이 지나면 자동 삭제 대상이 되며(2026년 12월 14일부터 매일 자동 정리, 마지막으로 고친 날이 아니라 처음 만든 날 기준), 더 오래 두려면 메인 사이트의 저장 구독으로 기간을 늘릴 수 있습니다. 중요한 화면은 JSON·이미지·코드로 받아 두세요.</p>
          </article>
        </div>
      </section>

      {/* 섹션 8: 단축키 모음 */}
      <section id="keys" className="card">
        <h2>⑧ 단축키 모음 (치트시트)</h2>
        <div className="gd-table">
          <div><strong><Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd></strong><span>실행 취소 (Undo)</span></div>
          <div><strong><Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Z</Kbd> 또는 <Kbd>Ctrl</Kbd> + <Kbd>Y</Kbd></strong><span>다시 실행 (Redo)</span></div>
          <div><strong><Kbd>Ctrl</Kbd> + <Kbd>D</Kbd></strong><span>선택한 요소 즉시 복제 (Duplicate)</span></div>
          <div><strong><Kbd>Ctrl</Kbd> + <Kbd>G</Kbd></strong><span>선택한 요소 2개 이상을 그룹으로 묶기</span></div>
          <div><strong><Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>G</Kbd></strong><span>선택한 그룹 풀기</span></div>
          <div><strong><Kbd>Delete</Kbd> 또는 <Kbd>Backspace</Kbd></strong><span>선택한 요소 삭제</span></div>
          <div><strong><Kbd>방향키 (↑, ↓, ←, →)</Kbd></strong><span>선택 요소 1px 정밀 이동</span></div>
          <div><strong><Kbd>Shift</Kbd> + <Kbd>방향키</Kbd></strong><span>선택 요소 10px 빠른 이동</span></div>
          <div><strong><Kbd>Esc</Kbd></strong><span>선택 해제 또는 도구 드로잉 취소</span></div>
        </div>
      </section>

      {/* 섹션 9: 자주 묻는 질문(FAQ) */}
      <section id="faq" className="card">
        <h2>⑨ 자주 묻는 질문 (FAQ)</h2>
        <div className="gd-faq">
          <details>
            <summary>Q1. 작업 중인 캔버스는 언제 저장되나요?</summary>
            <p>키보드 입력이나 마우스 드래그를 멈추고 약 1.5초가 지나면 회원님 계정에 자동으로 저장됩니다. 상단에 '저장됨'이 표시되면 창을 닫으셔도 됩니다. 저장 중에 [목록]을 누르면 저장을 마친 뒤 목록으로 이동합니다. 보관 기간은 위 「보관 기간」 안내를 따릅니다.</p>
          </details>
          <details>
            <summary>Q2. 고해상도 모니터에서 PNG로 저장하면 글자가 흐릿해지지 않나요?</summary>
            <p>내보내기 엔진이 html2canvas 캡처 시 스테이지 배율을 1:1 표준 해상도로 자동 보정하여 브라우저 화면 확대 비율과 무관하게 선명한 픽셀 단위 PNG로 출력합니다.</p>
          </details>
          <details>
            <summary>Q3. 스크린샷 이미지에서 UI를 복원할 때 어떤 이미지가 가장 잘 인식되나요?</summary>
            <p>모바일 앱이나 웹사이트의 정면 스크린샷(PNG/JPG)이 가장 인식률이 높습니다. 각도나 원근감이 들어간 목업 사진보다는 깔끔한 평면 캡처 이미지를 권장합니다.</p>
          </details>
          <details>
            <summary>Q4. 그룹으로 묶인 요소 중 하나만 따로 글자를 바꿀 수 있나요?</summary>
            <p>현재 버전에서는 그룹을 선택하고 <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>G</Kbd>로 잠시 풀어 개별 편집한 뒤, 다시 선택해 <Kbd>Ctrl</Kbd>+<Kbd>G</Kbd>로 묶는 방식을 권장합니다.</p>
          </details>
          <details>
            <summary>Q5. AI 기능을 사용할 때 추가 요금이나 크레딧 차감이 있나요?</summary>
            <p>AIMaster에서 따로 받는 요금은 없습니다. AI 버튼(이미지로 만들기, AI로 내용 채우기, AI 컴포넌트 생성기)을 누를 때마다 회원님 본인의 Google Gemini API 키로 호출되며, Google의 무료 사용량을 넘거나 유료 결제를 켠 키라면 Google 가격표대로 회원님 계정에 요금이 나갑니다. 캔버스 편집·저장·내보내기는 키 없이 무료입니다.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
