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
            <span>AI LANDING ARCHITECT · OFFICIAL MANUAL v1.10</span>
          </div>
          <h1 className="hero-title">
            전환율을 극대화하는 <span className="gradient-text">AI 랜딩페이지 기획 완전 가이드</span>
          </h1>
          <p className="hero-desc">
            주제만 정하면 AI가 전문 마케터 수준의 기획안(JSON/MD)과 실제 작동하는 고화질 반응형 HTML 프로토타입을 실시간으로 설계합니다.
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
          <a href="#pipeline" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>① 4단계 기획 파이프라인</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#byok" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>② API 키 등록 (BYOK 원칙)</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#sections" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>③ 6대 전환 블록 및 레이아웃</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#export" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>④ 산출물 활용 및 React 변환</a>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <a href="#faq" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>⑤ 자주 묻는 질문 (FAQ)</a>
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
              주제 예시를 고르거나 직접 입력하고, 타겟 고객층과 달성할 비즈니스 목표를 명시합니다. AI 자동 완성 기능으로 손쉽게 보완할 수 있습니다.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#8b5cf6", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>2</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>6대 전환 기획안 도출</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              30~60초 만에 히어로 카피, 페인포인트, 솔루션, 증거 자료, 가격표 등 전환 중심의 기획안이 구조화된 형태로 생성됩니다.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#0ea5e9", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>3</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>고화질 프로토타입 생성</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              [프로토타입 만들기] 클릭 한 번으로 Tailwind CSS 기반의 반응형 HTML 페이지를 즉시 렌더링하여 모바일·태블릿·데스크톱 뷰를 검증합니다.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#10b981", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>4</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>내보내기 & 실전 런칭</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
              완성된 HTML 파일을 다운로드하여 정적 웹호스팅에 바로 올리거나, React 변환 프롬프트를 복사하여 Vercel/Next.js 프로젝트로 배포합니다.
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
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>회원 개인 소유 격리 및 완벽한 보안 원칙 (BYOK — Bring Your Own Key)</p>
          </div>
        </div>

        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px 20px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <ShieldCheck size={20} style={{ color: "#2563eb", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ color: "#1e3a8a", fontSize: "14px" }}>최상위 보안 원칙 (BYOK Standard)</strong>
              <p style={{ fontSize: "13px", color: "#1e40af", margin: "4px 0 0", lineHeight: 1.5 }}>
                AI 랜딩페이지 기획 자동화는 운영자 키나 타 회원 키를 일체 공유하지 않으며, <b>회원님 본인의 Google Gemini API 키</b>로만 독립 동작합니다.
                등록된 키는 암호화되어 안전하게 보관되며 오직 회원님의 기획안 생성 시에만 직접 호출됩니다.
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
              좌측 사이드바의 <b>[API키등록·플랫폼연동]</b> 메뉴에서 복사한 키를 입력하고 <b>[키 등록]</b>을 누르면 즉시 모든 기능이 활성화됩니다.
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
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>6대 전환 블록 및 5대 최적 레이아웃</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>전환율을 높이기 위해 과학적으로 설계된 컴포넌트 아키텍처</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px", background: "#f8fafc" }}>
            <strong style={{ color: "#0f172a", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Layers size={16} style={{ color: "#2563eb" }} /> 6대 필수 전환 블록
            </strong>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
              <li><b>1. 히어로 섹션</b>: 이목을 사로잡는 헤드라인, 서브카피, 대표 CTA</li>
              <li><b>2. 페인포인트</b>: 타겟 고객이 겪고 있는 핵심 고통과 문제 제기</li>
              <li><b>3. 핵심 솔루션</b>: 제품/서비스가 제공하는 3대 해결 가치</li>
              <li><b>4. 소셜 프루프</b>: 실제 고객 후기, 별점, 언론 보도, 신뢰 지표</li>
              <li><b>5. 가격 & 오퍼</b>: 명확한 플랜 구성과 혜택, 한정 오퍼 강조</li>
              <li><b>6. 최종 행동 유도</b>: 거절할 수 없는 마지막 클로징 CTA 및 FAQ</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px", background: "#f8fafc" }}>
            <strong style={{ color: "#0f172a", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Palette size={16} style={{ color: "#8b5cf6" }} /> 5대 비즈니스 최적 레이아웃
            </strong>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>
              <li><b>카드형 (Card/Link)</b>: SNS 링크인바이오, 간편 모바일 프로필에 적합</li>
              <li><b>문서형 (Document)</b>: 전문 이력서, 상세 사업 소개서, 백서 구성</li>
              <li><b>히어로 폼형 (Hero Form)</b>: 상담 신청, 뉴스레터 구독, 리드 수집 특화</li>
              <li><b>갤러리형 (Portfolio)</b>: 시각적 작품, 사진, 디자이너 포트폴리오</li>
              <li><b>풀스케일 랜딩형 (Landing)</b>: SaaS, 유료 강좌, 이커머스 등 표준 랜딩</li>
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
                <td style={{ padding: "12px 14px", color: "#475569" }}>마케팅 팀, 카피라이터, 디자이너에게 기획 의도와 섹션별 카피를 전달하는 표준 설계서로 사용</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#10b981" }}>HTML 프로토타입</td>
                <td style={{ padding: "12px 14px" }}><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>.html (단일 파일)</code></td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>별도 서버 없이 브라우저에서 바로 열람 가능하며, Netlify/GitHub Pages에 즉시 업로드 가능</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#8b5cf6" }}>React 변환 프롬프트</td>
                <td style={{ padding: "12px 14px" }}><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>Prompt Text</code></td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>Claude Code, Cursor, ChatGPT에 붙여 넣어 완전한 Next.js/React 컴포넌트로 자동 구축 후 Vercel 배포</td>
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
              네, 기획안 결과 화면에서 각 섹션 우측의 [이 섹션 다시 만들기] 버튼을 누르면 해당 블록만 AI가 새로운 각도로 다시 작성해 줍니다. 또한 JSON을 직접 열어 텍스트를 손수 수정할 수도 있습니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 기획안 화면을 직접 끌어다 놓으며 다듬고 싶어요.</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              기획안 위쪽의 <b>[🧩 UI Canvas로 보내 다듬기]</b>를 누르면 헤드라인·설명·CTA 버튼·섹션이 <b>UI Canvas 자동화</b>의 새 프로젝트로 배치되어 새 창으로 열립니다. AI를 쓰지 않아 키 사용량이 들지 않으며, UI Canvas 이용 권한이 있어야 합니다. 다듬은 화면은 UI Canvas에서 이미지·React 코드로 내보낼 수 있습니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. Unsplash나 Pexels 고화질 이미지를 넣고 싶어요.</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              기본값은 무료 임의 사진(Picsum)입니다. [API키등록·플랫폼연동] 메뉴에서 Unsplash 또는 Pexels API 키를 등록하시면 기획안의 키워드에 딱 맞는 고화질 상업용 이미지가 자동으로 삽입됩니다.
            </p>
          </details>

          <details style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
            <summary style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Q. 작업 도중 컴퓨터가 꺼지거나 창을 닫으면 데이터가 날아가나요?</summary>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
              아닙니다. 모든 기획안과 변경 내역은 실시간 자동 저장(Auto-save)되므로 언제든 대시보드 프로젝트 목록에서 그대로 이어서 작업하실 수 있습니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
