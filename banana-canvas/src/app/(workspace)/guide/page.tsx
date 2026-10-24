import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { Sparkles, KeyRound, ExternalLink, ShieldCheck, Zap, Layers, Image as ImageIcon, Sliders, Palette, HelpCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="gd-step">
      <span className="gd-num">{n}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}

const STYLES_LIST = [
  { name: "피규어", category: "3D/입체" },
  { name: "3D 픽사 스타일", category: "3D/입체" },
  { name: "클레이메이션", category: "3D/입체" },
  { name: "지브리 애니메이션", category: "애니" },
  { name: "신카이 마코토", category: "애니" },
  { name: "한국 수묵화", category: "전통 회화" },
  { name: "유화 (인상주의)", category: "전통 회화" },
  { name: "수채화 일러스트", category: "전통 회화" },
  { name: "보태니컬 아트", category: "전통 회화" },
  { name: "사이버펑크", category: "SF/컨셉" },
  { name: "사이버 메카닉", category: "SF/컨셉" },
  { name: "다크 판타지", category: "SF/컨셉" },
  { name: "레트로 픽셀아트", category: "디지털" },
  { name: "미니멀리즘 벡터", category: "디지털" },
  { name: "네온 글로우", category: "디지털" },
  { name: "팝아트", category: "모던 아트" },
  { name: "빈티지 코믹스", category: "모던 아트" },
  { name: "흑백 느와르", category: "시네마틱" },
  { name: "스테인드글라스", category: "공예" },
  { name: "종이공예(페이퍼아트)", category: "공예" },
];

export default function GuidePage() {
  return (
    <div className="luxury-guide">
      {/* 헤더 */}
      <div className="page-heading">
        <p className="eyebrow">NANO BANANA STUDIO MASTER GUIDEBOOK</p>
        <h1>📖 연동 & 사용 매뉴얼</h1>
        <p>사진 한 장으로 복원·스타일 변환·합성·배경 제거·증명사진·8컷 스토리까지 완성하는 나노바나나 아틀리에 공식 가이드입니다.</p>
      </div>

      {/* 1. 럭셔리 히어로 배너 */}
      <section className="luxury-hero">
        <div className="luxury-mascot-box">🍌</div>
        <div className="luxury-hero-text">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
            <span className="brand-3d-badge">PRO v1.38 Master Guide</span>
            <span className="nav-badge-free">⚡ 0원 초고속 WebGPU 탑재</span>
          </div>
          <h2>나노바나나 크리에이티브 아틀리에에 오신 것을 환영합니다!</h2>
          <p>
            전문가 수준의 고화질 이미지 복원, 20종 프리미엄 스타일 변환, 5장 멀티 합성, 상업용 템플릿 제작 및 8컷 시네마틱 스토리까지 
            브라우저에서 바로 실현할 수 있습니다. 1~2단계만 숙지하셔도 모든 핵심 기능을 자유자재로 활용하실 수 있습니다.
          </p>
        </div>
      </section>

      {/* 2. 3단계 스마트 파이프라인 */}
      <section className="card">
        <h2>🍌 3단계 스마트 워크플로우</h2>
        <div className="luxury-flow">
          <div className="luxury-flow-card">
            <em>STEP 01</em>
            <b>🖼️</b>
            <strong>원본 이미지 준비</strong>
            <small>JPG·PNG·WEBP 업로드 (이미지 없이 만들기 가능)</small>
          </div>
          <div className="luxury-flow-card">
            <em>STEP 02</em>
            <b>🪄</b>
            <strong>도구 선택 및 AI 실행</strong>
            <small>복원·합성·스타일·지우개·만화·스토리 실행</small>
          </div>
          <div className="luxury-flow-card">
            <em>STEP 03</em>
            <b>✨</b>
            <strong>다운로드 & 계속 편집</strong>
            <small>고해상도 저장 또는 결과를 새 원본으로 연결</small>
          </div>
        </div>
      </section>

      {/* 3. 3D 목차 그리드 */}
      <nav className="card" aria-label="목차">
        <h2>🧭 퀵 가이드 목차</h2>
        <div className="luxury-toc">
          <a href="#key" className="luxury-toc-chip">🔑 ① API 키 등록 & 가입</a>
          <a href="#quick" className="luxury-toc-chip">⚡ ② 5분 시작하기</a>
          <a href="#tools" className="luxury-toc-chip">💎 ③ 12대 작업별 설명</a>
          <a href="#free-erase" className="luxury-toc-chip">🧼 ④ AI 매직 지우개 (0원)</a>
          <a href="#styles" className="luxury-toc-chip">🎨 ⑤ 20종 스타일 프리셋</a>
          <a href="#tips" className="luxury-toc-chip">💡 ⑥ 고화질 제작 요령</a>
          <a href="#privacy" className="luxury-toc-chip">🛡️ ⑦ 프라이버시 보호 규정</a>
          <a href="#faq" className="luxury-toc-chip">❓ ⑧ 막힐 때 (FAQ)</a>
        </div>
      </nav>

      {/* 4. API 키 등록 (생성 & 가입 버튼 제공) */}
      <section id="key" className="card">
        <h2>🔑 ① Google Gemini API 키 등록 (최초 1회)</h2>
        <p className="gd-lead">
          나노바나나 고화질 생성·복원·스타일 변환은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다.
        </p>

        {/* 퀵 액션 버튼 세트 */}
        <div className="platform-link-group" style={{ margin: "14px 0" }}>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-create-key"
          >
            <KeyRound size={14} />
            <span>Google AI Studio API 키 발급/생성하기</span>
            <ExternalLink size={12} style={{ opacity: 0.8 }} />
          </a>
          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-platform-signup"
          >
            <span>Google AI Studio 회원가입 / 시작</span>
            <ExternalLink size={12} style={{ opacity: 0.8 }} />
          </a>
        </div>

        <ol className="gd-steps">
          <Step n={1} title="API 키 만들기">
            위의 <b>[Google AI Studio API 키 발급/생성하기]</b> 버튼을 눌러 본인 Google 계정으로 로그인한 뒤, <code>[Create API key]</code>를 눌러 <code>AIza…</code>로 시작하는 키를 복사합니다.
          </Step>
          <Step n={2} title="프로그램에 등록">
            왼쪽 사이드바 메뉴 <b>[API키등록·플랫폼연동]</b>에서 키를 붙여 넣고 <code>[키 등록]</code>을 누릅니다.
          </Step>
          <Step n={3} title="등록 완료 확인">
            초록색 <code>등록 완료</code> 뱃지와 마스킹된 키가 표시되면 즉시 모든 AI 도구를 사용하실 수 있습니다.
          </Step>
        </ol>

        {GEMINI_GUIDE_URL && (
          <div className="actions" style={{ marginTop: 14 }}>
            <GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함 팝업)" />
          </div>
        )}

        <div className="gd-tip" style={{ marginTop: 14 }}>
          💡 <b>0원 무료 도구 안내:</b> <code>[🧼 AI 매직 지우개]</code>는 내 브라우저(WebGPU)에서 100% 로컬 연산되므로 API 키 없이도 평생 0원으로 무제한 이용하실 수 있습니다.
        </div>
      </section>

      {/* 5. 5분 시작하기 */}
      <section id="quick" className="card">
        <h2>⚡ ② 5분 시작하기</h2>
        <ol className="gd-steps">
          <Step n={1} title="원본 사진을 올립니다">
            <b>[🖼️ 1. 원본 준비]</b> 칸에 JPG, PNG, WEBP 사진(15MB 이하)을 드래그하여 올립니다. 사진 없이 새로 만들 때는 <b>[만들기]</b>를 바로 선택하세요.
          </Step>
          <Step n={2} title="원하는 AI 도구를 선택합니다">
            스튜디오 상단의 3D 바로가기 칩 또는 사이드바 메뉴에서 [옛 사진 복원], [편집], [합성], [4컷 만화], [8컷 스토리] 등 원하는 도구를 고릅니다.
          </Step>
          <Step n={3} title="[프롬프트 제안]을 활용합니다">
            어떤 문장을 적어야 할지 막막할 때는 <b>[프롬프트 제안]</b> 버튼을 누르면 AI가 전문적인 아트워크 묘사 프롬프트를 자동으로 채워줍니다.
          </Step>
          <Step n={4} title="결과를 저장하거나 이어서 편집합니다">
            <b>[다운로드]</b>로 저장하거나, <b>[이 결과로 계속 편집]</b>을 누르면 완성된 이미지가 즉시 새 원본으로 지정되어 2차, 3차 연속 리터칭이 가능합니다.
          </Step>
        </ol>
      </section>

      {/* 6. 12대 핵심 기능 럭셔리 카드 그리드 */}
      <section id="tools" className="card">
        <h2>💎 ③ 12대 작업별 상세 설명</h2>
        <div className="luxury-tool-grid">
          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🎨 만들기</h3>
              <span className="luxury-tool-badge">창작 생성</span>
            </div>
            <p>상상 속 아이디어를 입력하고 카테고리(실사·음식·건축·3D·벡터 등)와 종횡비를 선택하여 완전히 새로운 이미지를 생성합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>✨ 1클릭 복원 & 편집</h3>
              <span className="luxury-tool-badge">고화질 업스케일</span>
            </div>
            <p>빛바랜 사진 복원, 흑백 컬러화, 스케치 채색, 최대 4배(긴 변 8192px) 초고해상도 업스케일을 1클릭으로 실행합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🧼 AI 매직 지우개</h3>
              <span className="luxury-tool-badge free">0원 초고속 WebGPU</span>
            </div>
            <p>브라우저 로컬 하드웨어 가속(WebGPU)으로 이미지 내 불필요한 글자와 잡티를 1초 만에 흔적 없이 지웁니다. 외부 키 0원, 프라이버시 100% 보장.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🧩 5장 멀티 합성</h3>
              <span className="luxury-tool-badge">인물/배경 보존</span>
            </div>
            <p>원본 인물의 얼굴을 그대로 지키면서 최대 5장의 소스 이미지 요소(소품, 배경, 의상)를 자연스럽게 결합합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🎩 인물 증명사진</h3>
              <span className="luxury-tool-badge">규격 자동 변환</span>
            </div>
            <p>일상 스냅사진을 단정한 정장 차림과 깨끗한 흰색 스튜디오 배경의 3:4 표준 여권/증명사진으로 즉각 변환합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>✂️ 정밀 배경 제거 (누끼)</h3>
              <span className="luxury-tool-badge">투명 PNG</span>
            </div>
            <p>피사체의 외곽선을 정밀하게 분리하여 상품 상세페이지나 썸네일에 바로 쓸 수 있는 고품질 투명 배경 PNG를 제작합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🔮 정밀 인페인트</h3>
              <span className="luxury-tool-badge">AI 리터칭</span>
            </div>
            <p>브러시로 칠한 특정 영역만 Gemini AI가 주변 맥락을 분석하여 감쪽같이 새로운 물체로 대체하거나 다시 그립니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>📐 123종 상업 템플릿</h3>
              <span className="luxury-tool-badge">디자인 완성</span>
            </div>
            <p>19개 직군 123종 배너·포스터·카드뉴스 템플릿에 기획서 텍스트만 넣으면 전문 디자이너 수준의 완성 그래픽을 출력합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🎭 20종 화풍 변환</h3>
              <span className="luxury-tool-badge">아트 프리셋</span>
            </div>
            <p>사진을 피규어, 지브리, 신카이 마코토, 수묵화, 사이버펑크, 3D 픽사 스타일 등 독보적인 예술 작품으로 재해석합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>☕ 사진 요리책 레시피</h3>
              <span className="luxury-tool-badge">비주얼 요약</span>
            </div>
            <p>음식 사진 한 장으로 재료 목록과 조리 순서별 비주얼 요리책 카드를 자동으로 생성합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🎨 감성 4컷 만화</h3>
              <span className="luxury-tool-badge">말풍선 & 연출</span>
            </div>
            <p>사진의 등장인물과 상황을 웹툰, 아메리칸 코믹스, 흑백 느와르 만화 프레임에 대사와 함께 감성적으로 재구성합니다.</p>
          </div>

          <div className="luxury-tool-card">
            <div className="luxury-tool-card-head">
              <h3>🎬 8컷 시네마틱 스토리</h3>
              <span className="luxury-tool-badge">스토리보드</span>
            </div>
            <p>단 하나의 아이디어로 기승전결이 이어지는 8개 연속 장면을 일관된 캐릭터와 화풍으로 자동 기획 및 렌더링합니다.</p>
          </div>
        </div>
      </section>

      {/* 7. AI 매직 지우개 0원 가이드 */}
      <section id="free-erase" className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <h2>🧼 ④ AI 매직 지우개 (초고속 0원 WebGPU)</h2>
          <span className="nav-badge-free">100% 브라우저 로컬 연산 · 완전한 프라이버시</span>
        </div>
        <p className="bc-hint">
          ⏱ <b>프로그램 별도 설치 불필요!</b> 최초 1회 브라우저에 AI 가속 모델(LaMa Inpainting & RapidOCR)이 자동 캐싱된 후, 장당 1~2초 만에 초고속 연산됩니다. 크롬·엣지·웨일 최신 브라우저를 권장합니다.
        </p>

        <ol className="gd-steps">
          <Step n={1} title="사진을 추가합니다">
            사이드바의 <b>[🧼 AI 매직 지우개]</b> 메뉴를 클릭한 뒤, 사진을 드래그하거나 [사진 추가]로 최대 50장을 한 번에 등록합니다. 사진 데이터는 절대 외부 서버로 전송되지 않습니다.
          </Step>
          <Step n={2} title="지울 영역을 감지하거나 칠합니다">
            <b>[문구 찾기]</b>를 누르면 AI가 이미지 속 글자를 자동으로 찾아 핑크색 마스크로 지정합니다. 글자가 아닌 잡티나 로고는 <b>[칠하기]</b> 브러시로 넉넉하게 칠합니다.
          </Step>
          <Step n={3} title="1초 만에 깔끔하게 지웁니다">
            <b>[지우기]</b>를 누르면 주변 배경 텍스처를 자연스럽게 이어붙여 1초 만에 삭제합니다.
          </Step>
          <Step n={4} title="일괄 ZIP으로 내려받습니다">
            여러 장을 동일한 위치로 지울 때는 <b>[선택 사진 모두 지우기]</b>를 누르고, 완료 후 <b>[선택 결과 ZIP 내려받기]</b>로 한 번에 다운로드합니다.
          </Step>
        </ol>
      </section>

      {/* 8. 20종 스타일 프리셋 시각화 */}
      <section id="styles" className="card">
        <h2>🎨 ⑤ 20종 프리미엄 스타일 팔레트</h2>
        <p className="gd-lead">원하는 스타일을 선택하시면 프롬프트에 질감과 조명 세팅이 자동으로 최적화 주입됩니다.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", marginTop: "14px" }}>
          {STYLES_LIST.map((style, i) => (
            <span
              key={i}
              style={{
                padding: "7px 14px",
                borderRadius: "999px",
                background: "#ffffff",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                color: "#1c1917",
                fontSize: "12.5px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              }}
            >
              <span style={{ fontSize: "10px", color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: "6px" }}>
                {style.category}
              </span>
              <span>{style.name}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 9. 퀄리티 팁 & 주의사항 */}
      <section id="tips" className="card">
        <h2>💡 ⑥ 고화질 제작을 위한 전문가 팁</h2>
        <ul className="gd-list" style={{ lineHeight: 1.75 }}>
          <li><b>피사체의 해상도:</b> 원본 사진의 주요 피사체가 또렷할수록 복원 및 스타일 변환의 디테일이 비약적으로 향상됩니다.</li>
          <li><b>단계적 접근:</b> 여러 가지 변환이 필요할 때는 한 번에 많은 지시를 내리기보다, 1차 작업 후 <b>[이 결과로 계속 편집]</b>을 눌러 단계별로 적용하는 것이 가장 자연스럽습니다.</li>
          <li><b>프롬프트 제안 활용:</b> <code>[프롬프트 제안]</code> 버튼을 누르면 인물의 표정, 배경 조명, 카메라 렌즈 화각까지 최적의 영문/한글 키워드가 구성됩니다.</li>
        </ul>
      </section>

      {/* 10. 프라이버시 보호 규정 */}
      <section id="privacy" className="card">
        <h2>🛡️ ⑦ 개인정보 및 프라이버시 보호 규정</h2>
        <ul className="gd-list" style={{ lineHeight: 1.75 }}>
          <li><b>1시간 자동 영구 삭제:</b> 업로드하신 원본 사진은 AI 작업 즉시 임시 저장소에서 1시간 이내에 자동 영구 파기됩니다.</li>
          <li><b>회원 본인 키 격리:</b> 등록하신 Gemini API 키는 암호화되어 본인 계정 생성 요청 시에만 서버 간 직접 통신으로 사용되며 타인과 공유되지 않습니다.</li>
          <li><b>권리 준수:</b> 본인이 직접 촬영하였거나 정당한 사용 권리를 가진 이미지만 업로드해 주시기 바랍니다.</li>
        </ul>
      </section>

      {/* 11. 인터랙티브 럭셔리 아코디언 FAQ */}
      <section id="faq" className="card">
        <h2>❓ ⑧ 자주 묻는 질문 (FAQ)</h2>
        <div className="luxury-accordion">
          <details open>
            <summary>API 키는 어디서 발급받고 어떻게 등록하나요?</summary>
            <p>
              페이지 상단의 <b>[Google AI Studio API 키 발급/생성하기]</b> 버튼을 누르면 구글 공식 콘솔로 즉시 이동합니다.
              로그인 후 키를 복사하여 좌측 <b>[API키등록·플랫폼연동]</b> 메뉴에 붙여 넣으시면 1초 만에 등록됩니다.
            </p>
          </details>

          <details>
            <summary>AI 매직 지우개는 정말 비용이 전혀 안 드나요?</summary>
            <p>
              네! <code>[🧼 AI 매직 지우개]</code>는 사용자의 PC 브라우저(WebGPU / WASM) 하드웨어 자원을 직접 활용하여 연산하므로,
              외부 유료 API 호출이 발생하지 않아 평생 100% 무료(0원)이며 사진이 외부로 유출되지 않습니다.
            </p>
          </details>

          <details>
            <summary>무료 지우기에서 모델 다운로드 안내가 나와요.</summary>
            <p>
              최초 1회 실행 시 브라우저가 오픈소스 이미지 복원 AI 모델(LaMa 약 200MB)을 안전한 공개 저장소(huggingface.co)에서 자동으로 받아 브라우저 캐시에 저장합니다.
              이 작업은 PC당 최초 1회만 진행되며, 이후에는 다운로드 없이 즉시 실행됩니다.
            </p>
          </details>

          <details>
            <summary>이미지 생성 중 "AI 안전 정책" 오류가 나타납니다.</summary>
            <p>
              Google의 생성형 AI 콘텐츠 안전 가이드라인에 저촉되는 민감한 인물 묘사나 프롬프트가 포함된 경우 발생합니다.
              프롬프트를 보다 부드럽고 일상적인 묘사로 수정하시거나 다른 사진으로 시도해 주세요.
            </p>
          </details>

          <details>
            <summary>연속 스토리 생성이 8컷 미만으로 완성되었어요.</summary>
            <p>
              네트워크 순각 지연이나 특정 컷의 일시적 처리 지연으로 일부 컷이 누락될 수 있습니다.
              이 경우 [스토리 다시 생성]을 누르시면 동일한 시놉시스로 전체 8컷을 다시 렌더링합니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
