"use client";
import { useState } from "react";
import { LANGUAGES, DOMAINS, MODELS } from "@/lib/translation/model";

export function Guide() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "스캔된 이미지 PDF도 자동으로 텍스트를 추출해 번역할 수 있나요?",
      a: "본 프로그램은 텍스트 레이어가 존재하는 디지털 PDF 문서만 기기 내에서 직접 파싱합니다. 스캔된 이미지 PDF나 사진 형태의 문서는 텍스트 추출이 불가능하므로, OCR 도구(Google Drive, Adobe Acrobat 등)를 통해 텍스트로 변환한 후 TXT 파일이나 직접 복사·붙여넣기로 입력해 주시기 바랍니다.",
    },
    {
      q: "본인 Gemini API 키는 어디서 발급받으며 호출 비용은 어떻게 되나요?",
      a: "Google AI Studio(aistudio.google.com)에서 무료 또는 유료 API 키를 즉시 발급받아 좌측 [API키등록·플랫폼연동] 메뉴에 등록하시면 됩니다. Gemini 2.5 Flash 모델 기준 100만 토큰당 약 $0.10 수준으로 매우 저렴하며, 초보 회원님은 무료 할당량 내에서도 충분히 테스트하실 수 있습니다.",
    },
    {
      q: "20,000자가 넘는 매우 긴 대용량 문서는 어떻게 처리해야 하나요?",
      a: "안정적인 브라우저 메모리 관리 및 AI 토큰 한도 초과 방지를 위해 1회 번역 분량은 20,000자(Word 기준 약 15~20페이지)로 제한됩니다. 20,000자가 넘는 책이나 장문 보고서는 챕터별 또는 섹션별로 분할하여 작업하신 후 각각 Word DOCX로 다운로드받아 병합하시는 것을 권장합니다.",
    },
    {
      q: "Word(DOCX)로 다운로드할 때 표나 볼드, 제목 서식이 그대로 유지되나요?",
      a: "네! 제목(Heading 1~3), 볼드(굵게), 이탤릭(기울임), 단순 목록(Bullet), 단순 2단 표 서식은 Word DOCX 규격에 맞추어 깔끔하게 복원되어 다운로드됩니다. 다만 원본 문서에 포함된 복잡한 그래픽 이미지, 다단 레이아웃, 머리글/바닥글 장식은 번역 텍스트의 가독성을 위해 재현되지 않습니다.",
    },
    {
      q: "번역에 사용된 원문과 번역 데이터가 서버에 저장되거나 AI 학습에 사용되나요?",
      a: "절대 그렇지 않습니다! 본 프로그램은 BYOK(Bring Your Own Key) 보안 원칙을 엄격히 준수합니다. 입력하신 문서 파일은 오직 회원님의 브라우저 메모리 안에서만 처리되며, 서버 데이터베이스에는 원본 파일이 전혀 보관되지 않습니다. 회원님이 [작업 보관함에 저장]을 명시적으로 누른 프로젝트만 30일간 암호화 보관된 후 자동 파기됩니다.",
    },
  ];

  return (
    <div className="guide-container-v120">
      {/* 가이드북 히어로 배너 */}
      <section className="guide-hero">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              background: "rgba(255,255,255,0.2)",
              padding: "4px 10px",
              borderRadius: "20px",
              letterSpacing: "0.5px",
            }}
          >
            FOCUS STUDIO MANUAL
          </span>
          <span style={{ fontSize: "12px", opacity: 0.9 }}>
            v1.20 소프트 크림 에디션
          </span>
        </div>
        <h2>📖 AI 문서번역 & 3중 검수 스튜디오 완전 정복 가이드</h2>
        <p>
          원문 입력부터 전문 용어집(Glossary) 매칭, Gemini AI 청크 분할 번역,
          문맥·용어·문체 3중 실시간 검수, 그리고 다중 포맷(TXT·MD·Word DOCX) 내보내기까지
          고품질 번역의 모든 파이프라인을 안내해 드립니다.
        </p>
      </section>

      {/* 1. 4단계 핵심 워크플로우 다이어그램 */}
      <section className="card" style={{ background: "#ffffff" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "6px", color: "#1e293b" }}>
          1. 4단계 완결형 문서번역 파이프라인
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "18px" }}>
          길을 잃지 않는 단계별 워크플로우로 초보자도 전문가 수준의 번역 문서를 완성할 수 있습니다.
        </p>
        <div className="pipeline-steps">
          <div className="pipeline-step-item active">
            <div className="pipeline-step-num">1</div>
            <div className="pipeline-step-text">
              <strong>원문 준비 & 파일 파싱</strong>
              <small>TXT · PDF · Word 불러오기</small>
            </div>
          </div>
          <div className="pipeline-step-item active">
            <div className="pipeline-step-num">2</div>
            <div className="pipeline-step-text">
              <strong>용어집 매칭 & 언어 설정</strong>
              <small>10대 언어 · 전문 도메인</small>
            </div>
          </div>
          <div className="pipeline-step-item active">
            <div className="pipeline-step-num">3</div>
            <div className="pipeline-step-text">
              <strong>AI 분할 번역 & 3중 검수</strong>
              <small>문맥 · 용어 · 문체 자동 검수</small>
            </div>
          </div>
          <div className="pipeline-step-item active">
            <div className="pipeline-step-num">4</div>
            <div className="pipeline-step-text">
              <strong>역번역 대조 & 다중 내보내기</strong>
              <small>TXT · MD · Word DOCX</small>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 지원 파일 포맷 & 글로벌 언어 매트릭스 표 */}
      <section className="card" style={{ background: "#ffffff" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "6px", color: "#1e293b" }}>
          2. 지원 파일 규격 & 포맷 기능 매트릭스 표
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          원문 파일의 종류와 내보내기 포맷별 상세 스펙 및 서식 보존 범위를 확인하세요.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="matrix-table">
            <thead>
              <tr>
                <th>문서 포맷</th>
                <th>최대 처리 용량</th>
                <th>텍스트 파싱 방식</th>
                <th>서식 보존 범위</th>
                <th>내보내기 지원</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>텍스트 (TXT)</strong></td>
                <td>20,000자 (UTF-8)</td>
                <td>브라우저 인라인 파싱</td>
                <td>순수 플레인 텍스트</td>
                <td><span style={{ color: "#0d9488", fontWeight: 700 }}>✓ 지원</span> (.txt)</td>
              </tr>
              <tr>
                <td><strong>디지털 PDF</strong></td>
                <td>최대 5MB / 50페이지</td>
                <td>PDF.js 로컬 레이어 추출</td>
                <td>문단 구분 및 페이지 번호</td>
                <td>TXT / MD / DOCX 변환</td>
              </tr>
              <tr>
                <td><strong>워드 (DOCX)</strong></td>
                <td>최대 5MB / 20,000자</td>
                <td>Mammoth DOM 파서</td>
                <td>제목, 볼드, 이탤릭, 표, 목록</td>
                <td><span style={{ color: "#4f46e5", fontWeight: 700 }}>✓ 완벽 복원</span> (.docx)</td>
              </tr>
              <tr>
                <td><strong>마크다운 (MD)</strong></td>
                <td>20,000자</td>
                <td>Remark GFM 엔진</td>
                <td>헤딩, 코드블록, 표, 링크</td>
                <td><span style={{ color: "#0d9488", fontWeight: 700 }}>✓ 지원</span> (.md)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "14px", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", fontSize: "12px", color: "#64748b" }}>
          💡 <strong>지원 글로벌 10대 언어:</strong> {LANGUAGES.map((l) => l.name).join(" · ")}
          <br />
          💡 <strong>지원 전문 분야:</strong> {DOMAINS.join(" · ")}
        </div>
      </section>

      {/* 3. 전문 번역 품질 극대화 7대 황금 수칙 */}
      <section className="card" style={{ background: "#ffffff" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "6px", color: "#1e293b" }}>
          3. 전문 번역 품질 극대화 7대 황금 수칙
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          AI 번역의 정확도를 높이고 어색한 직역을 방지하는 실전 번역 노하우입니다.
        </p>
        <div className="rule-cards-grid">
          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">1</span>
              <h4>전문 용어집(Glossary) 사전 등록</h4>
            </div>
            <p>
              기업명, 고유명사, 업계 전문 용어는 미리 [용어집]에 등록해 두면 번역 전체에서 일관된 단어가 100% 적용됩니다.
            </p>
          </div>

          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">2</span>
              <h4>적정 청크(Chunk) 크기 유지</h4>
            </div>
            <p>
              문서가 1,500~2,000자 단위로 자동 분할되어 AI에 전달되므로 문맥 손실 없이 자연스러운 번역 품질이 유지됩니다.
            </p>
          </div>

          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">3</span>
              <h4>전문 도메인 카테고리 지정</h4>
            </div>
            <p>
              IT·비즈니스·의료·학술 등 문서의 분야를 명시하면 해당 분야의 표준 어조와 전문 어휘가 우선적으로 채택됩니다.
            </p>
          </div>

          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">4</span>
              <h4>문단별 인라인 실시간 수정</h4>
            </div>
            <p>
              번역 화면에서 마음에 들지 않는 문단을 즉시 수정할 수 있으며, 수정본에 대해 언제든 '현재 수정본 재검수'가 가능합니다.
            </p>
          </div>

          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">5</span>
              <h4>숫자 · URL · 특수기호 교차 점검</h4>
            </div>
            <p>
              우측 검수 패널에서 계약서의 금액, 일자, 통계 수치 및 링크가 원문과 오차 없이 일치하는지 자동으로 체크합니다.
            </p>
          </div>

          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">6</span>
              <h4>역번역(Back-translation) 교차 검증</h4>
            </div>
            <p>
              번역된 문장을 다시 원문 언어로 역번역하여 의미 왜곡이나 심각한 오역이 발생하지 않았는지 나란히 비교 대조합니다.
            </p>
          </div>

          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">7</span>
              <h4>로컬 JSON 백업 파일 보관</h4>
            </div>
            <p>
              작업 완료 후 [현재 작업 백업]을 통해 JSON 파일을 다운로드해 두면 언제든 오프라인에서도 작업을 그대로 복원할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 자주 묻는 질문 (FAQ 5종) 아코디언 */}
      <section className="card" style={{ background: "#ffffff" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "6px", color: "#1e293b" }}>
          4. 자주 묻는 질문 (FAQ 5종)
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          문서 번역 작업 중 자주 발생하는 궁금증과 해결 방법입니다.
        </p>
        <div className="faq-list">
          {faqs.map((faq, idx) => (
            <div className="faq-item" key={idx}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span>Q. {faq.q}</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {openFaq === idx ? "▲ 닫기" : "▼ 열기"}
                </span>
              </button>
              {openFaq === idx && <div className="faq-answer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
