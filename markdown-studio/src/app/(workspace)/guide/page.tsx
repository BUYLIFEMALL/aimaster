export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import {
  FilePlus2,
  PenTool,
  Download,
  FolderOpen,
  Cloud,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Keyboard,
  Layers,
  FileCode,
  FileText,
  Archive,
} from "lucide-react";

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">FOCUS STUDIO GUIDE</p>
        <h1>연동 & 사용 완벽 가이드북</h1>
        <p>초보자도 3분 만에 전문가처럼 문서를 준비하고, 작성하고, 내보내는 완벽 워크플로우를 안내합니다.</p>
      </div>

      {/* 1. 핵심 작업 흐름 시각적 다이어그램 */}
      <div className="guide-flow-diagram">
        <div className="flow-step-box">
          <div className="flow-step-number">1</div>
          <div className="flow-step-icon">📄</div>
          <strong>문서 준비</strong>
          <span>템플릿 시작 또는 기존 MD/TXT 파일 가져오기</span>
        </div>
        <div className="flow-step-box">
          <div className="flow-step-number">2</div>
          <div className="flow-step-icon">✍️</div>
          <strong>편집 & 미리보기</strong>
          <span>듀얼 분할 뷰와 고급 서식 실시간 렌더링</span>
        </div>
        <div className="flow-step-box">
          <div className="flow-step-number">3</div>
          <div className="flow-step-icon">📦</div>
          <strong>변환 & 내보내기</strong>
          <span>PDF·Word·HTML·ZIP 포맷별 원클릭 변환</span>
        </div>
        <div className="flow-step-box">
          <div className="flow-step-number">4</div>
          <div className="flow-step-icon">🗄️</div>
          <strong>보관 & 드라이브</strong>
          <span>30회 버전 복원 및 본인 Google Drive 연동</span>
        </div>
      </div>

      {/* 2. 단계별 상세 비주얼 가이드 카드 스택 */}
      <div className="guide-section-stack">
        {/* STEP 1 */}
        <section className="guide-card">
          <div className="guide-card-header">
            <div className="guide-card-title-group">
              <div className="guide-step-avatar">
                <FilePlus2 size={22} />
              </div>
              <div>
                <h2>1단계: 문서 준비 & 파일 가져오기</h2>
                <p>빈 문서나 사전 구성된 고품질 마크다운 템플릿으로 빠르게 시작하세요.</p>
              </div>
            </div>
            <span className="guide-tag accent">Step 01</span>
          </div>

          <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.7 }}>
            <p>
              <strong>• 새 문서 생성:</strong> [문서 준비] 화면에서 회의록, 기술 문서, 기획서 등 미리 준비된 템플릿을 선택하거나 빈 문서로 즉시 시작할 수 있습니다.
            </p>
            <p>
              <strong>• 기존 파일 가져오기:</strong> PC에 보관 중인 <code>.md</code>, <code>.txt</code> 파일이나 폴더를 드래그 앤 드롭으로 가져올 수 있습니다.
            </p>
          </div>

          <div className="guide-tip-box">
            <Lightbulb size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>안전한 이름 중복 방지:</strong> 기존 문서와 같은 이름의 파일을 가져오더라도 기존 내용을 덮어쓰지 않고, <code>(2)</code>, <code>(3)</code>을 자동으로 붙여 안전하게 보호합니다.
            </div>
          </div>
        </section>

        {/* STEP 2 */}
        <section className="guide-card">
          <div className="guide-card-header">
            <div className="guide-card-title-group">
              <div className="guide-step-avatar">
                <PenTool size={22} />
              </div>
              <div>
                <h2>2단계: 몰입형 에디터 & 실시간 미리보기</h2>
                <p>왼쪽에서 마크다운을 타이핑하고, 오른쪽에서 완성된 서식을 실시간으로 확인하세요.</p>
              </div>
            </div>
            <span className="guide-tag accent">Step 02</span>
          </div>

          <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.7 }}>
            <p>
              <strong>• 실시간 듀얼 분할 뷰:</strong> 타이핑과 동시에 정밀한 GFM(GitHub Flavored Markdown) 서식이 우측 패널에 렌더링됩니다. 분할 바를 조절해 원하는 너비로 에디터를 구성할 수 있습니다.
            </p>
            <p>
              <strong>• 자주 쓰는 단축키 치트시트:</strong>
            </p>
          </div>

          <div className="guide-chip-grid">
            <div className="guide-chip"><kbd>Ctrl</kbd> + <kbd>B</kbd> 굵게 (Bold)</div>
            <div className="guide-chip"><kbd>Ctrl</kbd> + <kbd>I</kbd> 기울임 (Italic)</div>
            <div className="guide-chip"><kbd>Ctrl</kbd> + <kbd>K</kbd> 하이퍼링크</div>
            <div className="guide-chip"><kbd>Ctrl</kbd> + <kbd>S</kbd> 즉시 강제 저장</div>
            <div className="guide-chip"><kbd>Ctrl</kbd> + <kbd>Z</kbd> 실행 취소</div>
            <div className="guide-chip"><kbd>Ctrl</kbd> + <kbd>F</kbd> 찾기 및 바꾸기</div>
          </div>

          <div className="guide-tip-box">
            <Lightbulb size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>모바일 최적화:</strong> 스마트폰이나 태블릿에서는 상단 탭 버튼(원문 편집 ↔ 미리보기)으로 매끄럽게 전환하며 편리하게 작업할 수 있습니다.
            </div>
          </div>
        </section>

        {/* STEP 3 */}
        <section className="guide-card">
          <div className="guide-card-header">
            <div className="guide-card-title-group">
              <div className="guide-step-avatar">
                <Download size={22} />
              </div>
              <div>
                <h2>3단계: 포맷별 변환 & 원클릭 내보내기</h2>
                <p>문서나 전체 폴더를 원하는 목적에 맞게 다양한 포맷으로 즉시 변환합니다.</p>
              </div>
            </div>
            <span className="guide-tag accent">Step 03</span>
          </div>

          <div className="format-showcase-grid">
            <div className="format-card-mini pdf">
              <span className="format-badge">PDF Document</span>
              <FileText size={28} color="#b91c1c" style={{ margin: "6px 0" }} />
              <strong>텍스트 검색 PDF</strong>
              <small>인쇄·제출용 / 글자 선택 및 검색 완벽 지원</small>
            </div>
            <div className="format-card-mini docx">
              <span className="format-badge">Word Document</span>
              <FileCode size={28} color="#1d4ed8" style={{ margin: "6px 0" }} />
              <strong>표준 Word (.docx)</strong>
              <small>MS Office / 한글과컴퓨터 편집 완벽 호환</small>
            </div>
            <div className="format-card-mini html">
              <span className="format-badge">Web Page</span>
              <Layers size={28} color="#c2410c" style={{ margin: "6px 0" }} />
              <strong>클린 HTML</strong>
              <small>웹사이트 게시 및 이메일 서식 배포용 코드</small>
            </div>
            <div className="format-card-mini zip">
              <span className="format-badge">Archive ZIP</span>
              <Archive size={28} color="#15803d" style={{ margin: "6px 0" }} />
              <strong>압축 패키지 (.zip)</strong>
              <small>전체 카테고리 폴더 구조를 보존한 일괄 다운로드</small>
            </div>
          </div>
        </section>

        {/* STEP 4 */}
        <section className="guide-card">
          <div className="guide-card-header">
            <div className="guide-card-title-group">
              <div className="guide-step-avatar">
                <FolderOpen size={22} />
              </div>
              <div>
                <h2>4단계: 체계적인 보관함 & 30회 버전 복원</h2>
                <p>실수로 내용을 지우거나 이전 작성본이 필요할 때 언제든 과거 시점으로 복원하세요.</p>
              </div>
            </div>
            <span className="guide-tag accent">Step 04</span>
          </div>

          <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.7 }}>
            <p>
              <strong>• 자동 리비전 타임라인:</strong> 문서 저장 시마다 최대 30개의 이전 버전 이력이 안전하게 보관됩니다. 이력 목록에서 작성 시간과 글자 수를 확인하고 언제든 [이 본문 복원] 버튼으로 되살릴 수 있습니다.
            </p>
            <p>
              <strong>• 안전 휴지통:</strong> 삭제된 문서는 영구 삭제되지 않고 휴지통에 보관되며, 폴더 복원 시 하위 문서까지 한 번에 원래 위치로 되돌아옵니다.
            </p>
            <p>
              <strong>• 전체 데이터 백업(.json):</strong> 보관함의 [전체 백업] 버튼으로 작성한 모든 문서를 JSON 파일 하나로 안전하게 내려받을 수 있습니다.
            </p>
          </div>
        </section>

        {/* STEP 5: GOOGLE DRIVE OAUTH */}
        <section className="guide-card">
          <div className="guide-card-header">
            <div className="guide-card-title-group">
              <div className="guide-step-avatar">
                <Cloud size={22} />
              </div>
              <div>
                <h2>Google Drive 1:1 안전 연동 가이드</h2>
                <p>회원 본인의 Google Cloud OAuth Client ID로 내 드라이브에 안전하게 동기화합니다.</p>
              </div>
            </div>
            <span className="guide-tag">선택 연동</span>
          </div>

          <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.7 }}>
            <p>
              AIMaster의 절대 불변 철학에 따라, <strong>운영자의 공용 앱이나 타인의 키를 공유하지 않고 회원 본인의 Google Cloud 프로젝트와 1:1로만 연결</strong>됩니다.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", margin: "14px 0" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: "12px", color: "#4f46e5", marginBottom: "4px" }}>1단계</strong>
                <span style={{ fontSize: "11px", color: "#334155" }}>Google Cloud 콘솔에서 OAuth 웹 클라이언트 ID 발급</span>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: "12px", color: "#4f46e5", marginBottom: "4px" }}>2단계</strong>
                <span style={{ fontSize: "11px", color: "#334155" }}>[API키등록·플랫폼연동] 메뉴에 내 Client ID 등록</span>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: "12px", color: "#4f46e5", marginBottom: "4px" }}>3단계</strong>
                <span style={{ fontSize: "11px", color: "#334155" }}>[보관함]에서 내 Google Drive 폴더로 자동 업로드/가져오기</span>
              </div>
            </div>
          </div>

          <div className="guide-notice-box">
            <Lock size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>철저한 보안 원칙:</strong> 인증에 사용되는 접근 토큰(Access Token)은 서버에 저장되지 않고 오직 회원님의 브라우저 메모리에만 일시적으로 보관되며, 페이지 새로고침 시 즉시 초기화되어 안전합니다.
            </div>
          </div>
        </section>

        {/* DATA STORAGE & SECURITY NOTICE */}
        <section className="card" style={{ background: "#f8faff", borderColor: "#c7d2fe" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 750, color: "#1e1b4b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={20} color="#4f46e5" />
            데이터 보관 안내 및 백업 권장 사항
          </h2>
          <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.8 }}>
            <p>
              • <strong>로컬 브라우저 영구 보관:</strong> 작성하신 모든 문서는 로그인한 계정별로 이 브라우저의 안전한 로컬 데이터베이스(IndexedDB)에 보관됩니다.
            </p>
            <p>
              • <strong>정기적 백업 권장:</strong> 브라우저 캐시 삭제나 기기 변경 시 데이터가 유실되지 않도록, 주기적으로 <code>[원문 저장]</code> 또는 <code>[보관함 전체 백업]</code>을 통해 중요 원고를 PC에 보관해 주시기 바랍니다.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
