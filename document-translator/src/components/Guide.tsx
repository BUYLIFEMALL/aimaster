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
      a: "Google AI Studio(aistudio.google.com)에서 API 키를 발급받은 뒤, 좌측 [API키등록·플랫폼연동] 화면의 [본인 API 키 등록·수정] 버튼을 누르면 AIMaster 메인 사이트의 API 키 등록 화면이 새 창으로 열립니다. 거기서 Gemini 키를 저장하고 이 화면으로 돌아와 [등록 상태 다시 확인]을 누르면 '등록됨'으로 바뀝니다. 번역 모델은 같은 화면에서 Gemini 3.8 Flash(기본)와 Gemini 3.5 Flash-Lite(경제형) 중에서 고릅니다. 요금은 Google 가격표를 따르며 번역·AI 문서 정리·재검수·역번역 버튼을 누를 때마다 회원님 키로 청구됩니다(무료 사용량 범위는 Google 정책을 따릅니다).",
    },
    {
      q: "20,000자가 넘는 매우 긴 대용량 문서는 어떻게 처리해야 하나요?",
      a: "원문은 한 작업에 20,000자까지 넣을 수 있습니다. 번역할 때는 약 4,000자씩 최대 10묶음으로 나눠 AI를 호출하며, 실행 전에 원문 아래에 예상 호출 수가 표시됩니다. 20,000자가 넘는 책이나 장문 보고서는 챕터별로 나눠 각각 작업한 뒤 Word DOCX로 받아 합치시는 것을 권장합니다.",
    },
    {
      q: "Word(DOCX)로 다운로드할 때 표나 볼드, 제목 서식이 그대로 유지되나요?",
      a: "번역문은 화면에 보이는 Markdown 서식(제목, 굵게, 기울임, 목록, 표)을 Word 서식으로 옮겨 DOCX로 저장합니다. 원본 Word 파일의 레이아웃을 그대로 복사하는 방식은 아니어서, 이미지·다단 레이아웃·머리글/바닥글 장식은 옮겨지지 않습니다. 복잡한 표는 저장 후 Word에서 한 번 확인해 주세요.",
    },
    {
      q: "번역에 사용된 원문과 번역 데이터는 어디에 저장되나요?",
      a: "불러온 파일은 회원님 브라우저 안에서 글자만 뽑아내며, 원본 파일 자체는 서버에 올리지 않습니다. 번역·검수 버튼을 누르면 해당 글이 회원님 Gemini 키로 Google에 전송되므로, 전송된 내용의 처리 방식은 Google Gemini API 약관(무료·유료 등급에 따라 다름)을 따릅니다. 서버에는 회원님이 저장 버튼을 누른 작업만 보관함에 저장되며, 처음 저장한 날부터 30일이 지나면 자동으로 삭제됩니다(다시 저장해도 기간이 늘지 않으며, 보관함에 만료일이 표시됩니다). 보관함은 최대 100개까지 저장됩니다. AI 실행 기록에는 원문·번역문·키가 남지 않고 처리 상태만 24시간 보관됩니다. 오래 남길 작업은 [JSON 백업 다운로드]로 내 PC에 받아 두세요.",
    },
    {
      q: "업무 워크스페이스와 문서를 주고받을 수 있나요?",
      a: "네. AI 업무 워크스페이스에서 이 프로그램으로 보낸 문서가 있으면 문서번역 화면 위쪽에 '📥 업무 워크스페이스에서 받은 문서'가 보이고, 눌러서 원문으로 넣을 수 있습니다(지금 작업을 저장하거나 [＋ 새 번역]을 누른 뒤에 열 수 있습니다). 번역이 끝나면 [📨 워크스페이스로 보내기]로 워크스페이스의 '받은 업무'에 보낼 수 있습니다. 받은 문서는 원문 칸에 넣기만 하고, 번역은 회원님이 직접 실행할 때만 진행됩니다.",
    },
    {
      q: "처음 시작하기 전에 무엇을 준비해야 하나요?",
      a: "첫째, AIMaster에 로그인합니다(핸드폰 번호가 등록되어 있어야 합니다). 둘째, Gemini API 키를 메인 사이트에 등록하고 [API키등록·플랫폼연동]에서 '등록됨'을 확인합니다. 셋째, 자주 쓰는 전문 용어가 있으면 [용어집]에 먼저 넣고 [현재 번역에 적용]을 누릅니다. 넷째, [문서번역]에서 원문을 붙여 넣거나 [파일 불러오기](TXT·PDF·DOCX)로 넣고 언어·분야를 고른 뒤 번역을 실행합니다.",
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
                <td>파일 5MB · 20,000자</td>
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
                <td>제목, 볼드, 이탤릭, 표, 목록 (이미지는 제외)</td>
                <td><span style={{ color: "#4f46e5", fontWeight: 700 }}>✓ 지원</span> (.docx)</td>
              </tr>
              <tr>
                <td><strong>마크다운 (MD)</strong></td>
                <td>20,000자 (직접 붙여넣기)</td>
                <td>파일 불러오기는 미지원 · 내용을 복사해 원문 칸에 붙여넣기</td>
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
              문서는 약 4,000자 단위(최대 10묶음)로 자동으로 나뉘어 AI에 전달되고, 앞 묶음의 내용을 함께 참고해 문맥을 이어 갑니다. 실행 전에 예상 호출 수를 확인하세요.
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
              번역 후 원문과 번역문의 숫자 표기와 링크(URL)를 AI 없이 화면에서 비교해, 달라진 숫자나 빠진 URL이 있으면 「숫자·URL 직접 확인」 칸에 보여 줍니다. 표기 방식만 바뀐 경우도 있으니 직접 대조해 주세요.
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
              작업 완료 후 [JSON 백업 다운로드]로 파일을 받아 두면 보관함 저장 기간(30일)이 지나도 [JSON 백업 불러오기]로 작업을 새로 불러올 수 있습니다(4MB까지).
            </p>
          </div>
        </div>
      </section>

      {/* 2026-11-13 보강: 화면별로 무엇을 누르는지 */}
      <section className="card" style={{ background: "#ffffff" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "6px", color: "#1e293b" }}>
          화면별 버튼 안내 — 무엇을 누르면 무엇이 나오나요
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          💳 표시가 붙은 AI 버튼은 누를 때마다 회원님 Gemini 키로 요금이 나갑니다. 나머지는 무료입니다.
        </p>
        <div className="rule-cards-grid">
          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">1</span>
              <h4>원문 넣기</h4>
            </div>
            <p>
              [문서번역]에서 원문을 붙여 넣거나 [파일 불러오기]로 TXT·PDF·DOCX(5MB까지)를 엽니다. 💳 [AI 문서 정리]를 누르면 내용·숫자·순서는 그대로 두고 읽기 좋은 Markdown으로 정리합니다.
            </p>
          </div>
          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">2</span>
              <h4>번역 실행</h4>
            </div>
            <p>
              원문 언어(자동 감지 가능)·번역할 언어·분야를 고르고 💳 번역을 실행합니다. 결과는 원문과 나란히 문단별로 보이며, 번역문은 직접 고칠 수 있습니다.
            </p>
          </div>
          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">3</span>
              <h4>검수와 역번역</h4>
            </div>
            <p>
              💳 [현재 수정본 재검수]는 문맥·용어 제안과 문체 참고 점수를 보여 줍니다(정확성 보증이 아닌 참고 평가). 💳 [역번역 실행] 뒤 [역번역 보기]로 원문 언어로 되돌린 문장을 나란히 비교합니다. 원문 언어가 '자동 감지'인데 아직 감지되지 않았다면 역번역 버튼이 잠깁니다.
            </p>
          </div>
          <div className="rule-card-item">
            <div className="rule-card-header">
              <span className="rule-badge">4</span>
              <h4>저장과 내보내기</h4>
            </div>
            <p>
              [원문 저장]·[번역문 저장]에서 TXT·MD·DOCX로 받습니다. 작업은 보관함에 저장(30일)하고, 오래 둘 작업은 JSON 백업으로 받아 둡니다. 용어집은 [용어집 저장](최대 200개)과 CSV·TXT 다운로드를 지원합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 자주 묻는 질문 (FAQ 5종) 아코디언 */}
      <section className="card" style={{ background: "#ffffff" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "6px", color: "#1e293b" }}>
          4. 자주 묻는 질문 (FAQ)
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
