import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import {
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  HelpCircle,
  KeyRound,
  Layers,
  Lightbulb,
  MousePointerClick,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function GuidePage() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* 1. 상단 히어로 배너 */}
      <section className="studio-hero" style={{ marginBottom: "28px" }}>
        <div style={{ maxWidth: "800px" }}>
          <div className="hero-badge">
            <BookOpen size={14} />
            <span>AI LANDING ARCHITECT · OFFICIAL MANUAL</span>
          </div>
          <h1 className="hero-title">
            전환율을 극대화하는 <span className="gradient-text">AI 랜딩페이지 기획 완전 가이드</span>
          </h1>
          <p className="hero-desc">
            주제·타겟·목표를 적으면 AI가 6개 섹션으로 정리된 기획안(JSON·Markdown)과, 브라우저에서 바로 열리는 반응형 HTML 프로토타입을 만들어 줍니다.
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
            <a href="/dashboard" className="button primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Zap size={16} />
              <span>지금 기획 시작하기</span>
            </a>
            <a href="/settings" className="button secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <KeyRound size={16} />
              <span>본인 API 키 등록하기</span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. 빠른 목차 네비게이션 */}
      <nav className="card" style={{ padding: "16px 20px", marginBottom: "28px", background: "#f8fafc", borderColor: "#e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <Sparkles size={16} style={{ color: "#2563eb" }} />
          <strong style={{ fontSize: "14px", color: "#1e293b" }}>빠른 매뉴얼 목차</strong>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "13px" }}>
          <a href="#pipeline" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>1. 4단계 기획 파이프라인</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#byok" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>2. API 키 등록 (본인 키)</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#sections" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>3. 기획안 6개 섹션과 레이아웃</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#export" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>4. 산출물 활용 및 React 변환</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#faq" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>5. 자주 묻는 질문 (FAQ)</a>
        </div>
      </nav>

      {/* 3. 섹션 ① 4단계 표준 기획 파이프라인 다이어그램 */}
      <section id="pipeline" className="card" style={{ padding: "28px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "6px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>1</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>4단계 표준 기획 파이프라인</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>아이디어 구상부터 실전 웹페이지 런칭까지 물 흐르듯 이어지는 4단계 작업 흐름</p>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginTop: "20px"
        }}>
          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#2563eb", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>1</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>전략 & 타겟 설정</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              [내 프로젝트]에서 새 프로젝트를 만든 뒤 주제 예시(20종)를 고르거나 주제를 직접 적고, 타겟과 목표를 적습니다. 막막하면 [타겟/목표 자동 완성]을 누르면 AI가 채워 줍니다. 이미지 소스와 AI 모델(Pro·Standard)도 여기서 고릅니다.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#8b5cf6", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>2</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>기획안 6개 섹션 생성</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              [기획안 생성 시작]을 누르면 보통 30~60초 뒤 프로젝트 정보·페이지 구조·콘텐츠 전략·디자인 시스템·개발 가이드·이미지 에셋 6개 섹션으로 정리된 기획안이 나옵니다. 섹션을 펼쳐 직접 고치거나 그 섹션만 다시 만들 수 있습니다.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#0ea5e9", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>3</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>HTML 프로토타입 생성</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              기획안 아래 [프로토타입 만들기]를 누르면 Tailwind CSS 기반 반응형 HTML 한 파일이 만들어지고(보통 1~2분), 미리보기에서 모바일·태블릿·데스크톱 폭으로 바꿔 볼 수 있습니다.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#10b981", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>4</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>내보내기 & 다듬기</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              [HTML 다운로드]·[JSON 저장]으로 파일을 받거나, [변환 프롬프트 복사(기획안 포함)]를 코딩 AI에 붙여 넣어 React 프로젝트로 바꿉니다. [🧩 UI Canvas로 보내 다듬기]를 누르면 UI Canvas 자동화에서 화면을 직접 끌어다 놓으며 고칠 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 섹션 ② API 키 등록 (BYOK 원칙) */}
      <section id="byok" className="card" style={{ padding: "28px", marginBottom: "28px", borderLeft: "4px solid #2563eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "6px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>2</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>회원 본인 Google Gemini API 키 등록 (최초 1회)</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>회원 본인 키로만 동작합니다 (BYOK — Bring Your Own Key)</p>
          </div>
        </div>

        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px 20px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <ShieldCheck size={20} style={{ color: "#2563eb", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ color: "#1e3a8a", fontSize: "14px" }}>본인 키 원칙 (BYOK)</strong>
              <p style={{ fontSize: "13px", color: "#1e40af", margin: "4px 0 0", lineHeight: 1.5 }}>
                AI 랜딩페이지 기획 자동화는 운영자 키나 타 회원 키를 일체 공유하지 않으며, <b>회원님 본인의 Google Gemini API 키</b>로만 독립 동작합니다.
                등록된 키는 본인 계정에 연결해 보관하며 회원님이 AI 버튼을 누를 때만 호출합니다. AI 사용 비용은 본인 Google 계정으로 청구됩니다.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontWeight: 700, color: "#2563eb" }}>STEP 1.</span>
              <strong style={{ fontSize: "14px" }}>Google AI Studio 키 발급</strong>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
              <code>aistudio.google.com/apikey</code>에 접속하여 구글 계정으로 로그인 후 <b>[Create API key]</b>를 눌러 <code>AIza…</code>로 시작하는 키를 복사합니다.
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="button secondary"
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              Google AI Studio 키 발급 바로가기 ↗
            </a>
          </div>

          <div style={{ border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontWeight: 700, color: "#2563eb" }}>STEP 2.</span>
              <strong style={{ fontSize: "14px" }}>프로그램 내 키 저장</strong>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
              좌측 사이드바의 <b>[API키등록·플랫폼연동]</b> 메뉴에서 복사한 키를 입력하고 <b>[키 등록]</b>을 누르면 바로 AI 기능을 쓸 수 있습니다. 같은 화면에서 선택 사항인 Unsplash·Pexels·Pixabay 이미지 키도 등록할 수 있습니다.
            </p>
            <a
              href="/settings"
              className="button primary"
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              키 등록 페이지로 이동 →
            </a>
          </div>
        </div>

        {GEMINI_GUIDE_URL && (
          <div style={{ marginTop: "16px" }}>
            <GuideLinkButton url={GEMINI_GUIDE_URL} label="📸 Gemini 키 발급 상세 시각 가이드 (새 창)" />
          </div>
        )}
      </section>

      {/* 5. 섹션 ③ 6대 전환 블록 및 레이아웃 */}
      <section id="sections" className="card" style={{ padding: "28px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "6px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>3</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>기획안 6개 섹션과 레이아웃 5종</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>기획안이 어떤 항목으로 만들어지고, 어떤 화면 형태를 고를 수 있는지 설명합니다</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px", background: "#f8fafc" }}>
            <strong style={{ color: "#0f172a", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Layers size={16} style={{ color: "#2563eb" }} /> 기획안 6개 섹션
            </strong>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
              <li><b>1. 프로젝트 정보</b>: 주제·타겟·목표, 레이아웃, 구조 전략, 디자인 의도</li>
              <li><b>2. 페이지 구조</b>: 메인 페이지의 섹션 목록과 서브 페이지</li>
              <li><b>3. 콘텐츠 전략</b>: 헤드라인, 서브 헤드라인, CTA 문구, 핵심 메시지</li>
              <li><b>4. 디자인 시스템</b>: 주색·보조색·배경색, 글꼴, 분위기</li>
              <li><b>5. 개발 가이드</b>: 기술 스택, 폴더 구조, 배포 방법</li>
              <li><b>6. 이미지 에셋</b>: 필요한 이미지의 이름·검색 키워드·설명</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px", background: "#f8fafc" }}>
            <strong style={{ color: "#0f172a", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Palette size={16} style={{ color: "#8b5cf6" }} /> 레이아웃 5종 (주제 예시에 따라 정해짐)
            </strong>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
              <li><b>카드형</b>: 모바일 프로필 카드 — 링크 인 바이오, 지역 소규모 서비스 등</li>
              <li><b>문서형</b>: A4 이력서·소개서 — 온라인 이력서, 프리랜서 소개, 설문</li>
              <li><b>히어로형</b>: 전체 화면 + 입력 폼 — 뉴스레터 구독, 강의 접수, 대기자 명단</li>
              <li><b>갤러리형</b>: 그리드 모음 — 포트폴리오, 콘텐츠 허브, 웹도구 모음</li>
              <li><b>랜딩형</b>: 섹션 스크롤 — 기업·가게 홍보, 컨설팅 예약, 디지털 굿즈 판매 (「기타(직접 입력)」는 AI가 자동 선택)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. 섹션 ④ 산출물 활용 및 React 변환 */}
      <section id="export" className="card" style={{ padding: "28px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "6px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>4</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>산출물 활용 및 React 프로젝트 변환 가이드</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>기획안을 팀원과 공유하거나 실제 배포 가능한 웹 애플리케이션으로 확장하는 방법</p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "10px 14px", color: "#1e293b" }}>산출물 종류</th>
                <th style={{ padding: "10px 14px", color: "#1e293b" }}>포맷</th>
                <th style={{ padding: "10px 14px", color: "#1e293b" }}>주요 용도 및 활용 시나리오</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#2563eb" }}>기획안 문서</td>
                <td style={{ padding: "12px 14px" }}><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>JSON / Markdown</code></td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>[JSON 복사]·[Markdown 복사]·[JSON 저장] 버튼으로 받습니다. 팀원·디자이너에게 기획 의도와 섹션별 내용을 전달하는 설계서로 쓸 수 있습니다</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#10b981" }}>HTML 프로토타입</td>
                <td style={{ padding: "12px 14px" }}><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>.html (단일 파일)</code></td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>[HTML 복사]·[HTML 다운로드] 버튼으로 받습니다. 별도 서버 없이 브라우저에서 바로 열 수 있고, 정적 웹호스팅에 올릴 수 있습니다</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#8b5cf6" }}>React 변환 프롬프트</td>
                <td style={{ padding: "12px 14px" }}><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>Prompt Text</code></td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>[변환 프롬프트 복사(기획안 포함)] 버튼으로 복사해 HTML과 함께 코딩 AI에 붙여 넣으면 Vite + React 프로젝트로 바꿀 수 있습니다</td>
              </tr>
              <tr style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0ea5e9" }}>UI Canvas 프로젝트</td>
                <td style={{ padding: "12px 14px" }}><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>UI Canvas 새 프로젝트</code></td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>[🧩 UI Canvas로 보내 다듬기] 버튼으로 헤드라인·CTA·섹션·이미지를 UI Canvas 자동화에 배치합니다(AI 사용량 없음, UI Canvas 이용 권한 필요)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. 섹션 ⑤ 자주 묻는 질문 (FAQ) 아코디언 */}
      <section id="faq" className="card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "6px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>5</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>자주 묻는 질문 (FAQ)</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>작업 도중 궁금한 점이나 오류가 발생했을 때 바로 확인하세요.</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. "API 키 등록이 필요합니다"라는 알림이 떠요.</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              본 프로그램은 본인 키 원칙(BYOK)을 준수합니다. 좌측 메뉴의 <b>[API키등록·플랫폼연동]</b>에서 본인의 Google Gemini API 키를 등록해 주시면 즉시 정상 이용이 가능합니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 프로토타입 생성에 시간이 얼마나 걸리나요?</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              기획안은 보통 30~60초, HTML 프로토타입 코드는 약 1~2분 정도 소요됩니다. 전체 웹페이지 코드를 정밀하게 구성하므로 창을 닫지 마시고 잠시만 기다려 주세요.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 특정 섹션의 카피나 내용만 수정할 수 있나요?</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              네, 기획안에서 고칠 섹션 이름을 눌러 펼치면 두 가지 방법이 있습니다. 내용(JSON)을 직접 고친 뒤 [수정 적용]을 누르면 AI 없이 바로 반영되고, [이 섹션 다시 만들기]를 누르면 그 섹션만 AI가 다시 씁니다(본인 키 사용). 기획안을 고친 뒤에는 [프로토타입 다시 만들기]를 눌러야 HTML에 반영됩니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 기획안 화면을 직접 끌어다 놓으며 다듬고 싶어요.</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              기획안 위쪽의 <b>[🧩 UI Canvas로 보내 다듬기]</b>를 누르면 헤드라인·설명·CTA 버튼·섹션이 <b>UI Canvas 자동화</b>의 새 프로젝트로 배치되어 새 창으로 열립니다. 기획안의 이미지 에셋도 함께 배치됩니다. 이미지 소스를 Unsplash·Pexels·Pixabay로 고르고 본인 키를 등록해 두면 키워드에 맞는 실제 사진이, 아니면 무료 임시 사진이 들어갑니다(오른쪽 [속성]에서 바꿀 수 있습니다), 내용이 있는 서브 페이지는 각각 별도 프로젝트로 만들어집니다. AI를 쓰지 않아 키 사용량이 들지 않으며, UI Canvas 이용 권한이 있어야 합니다. 다듬은 화면은 UI Canvas에서 이미지·React 코드로 내보낼 수 있습니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. Unsplash나 Pexels 고화질 이미지를 넣고 싶어요.</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              기본값은 키가 필요 없는 무료 임의 사진입니다. [API키등록·플랫폼연동] 메뉴에서 Unsplash·Pexels·Pixabay 중 쓰려는 곳의 본인 키를 등록하고, 프로젝트의 [이미지 소스]에서 그곳을 고르면 기획안의 키워드로 찾은 사진이 프로토타입에 들어갑니다. 못 찾은 자리는 임시 사진으로 남으며 [이미지 다시 찾기] 버튼으로 다시 시도할 수 있습니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 작업 도중 컴퓨터가 꺼지거나 창을 닫으면 데이터가 날아가나요?</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              아닙니다. 내용을 바꾸면 약 1초 뒤 자동 저장되고, 프로젝트 이름 옆에 「저장됨」이 표시됩니다. [내 프로젝트] 목록에서 언제든 이어서 작업할 수 있습니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 프로젝트는 몇 개까지, 얼마나 보관되나요?</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              프로젝트는 최대 50개까지 저장됩니다. 가득 차면 쓰지 않는 프로젝트를 삭제해야 새로 만들 수 있습니다. AIMaster의 자료 보관 기준(일반 회원 500MB·만든 뒤 30일, 저장 구독으로 연장)에 따라 오래된 자료는 정리될 수 있으니, 오래 두고 쓸 기획안과 프로토타입은 [JSON 저장]·[HTML 다운로드]로 내 PC에 받아 두세요.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 어떤 버튼을 누를 때 내 API 키 사용량이 드나요?</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              [타겟/목표 자동 완성], [기획안 생성 시작]·[기획안 다시 만들기], [이 섹션 다시 만들기], [프로토타입 만들기]·[프로토타입 다시 만들기]는 누를 때마다 본인 Gemini 키로 AI를 호출합니다. AI 모델 <b>Pro (고품질, 느림)</b>는 품질을 우선하고 <b>Standard (빠름)</b>는 속도를 우선합니다. 복사·다운로드·[수정 적용]·[UI Canvas로 보내 다듬기]는 AI를 쓰지 않습니다. 진행 중에는 [취소]로 멈출 수 있습니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
