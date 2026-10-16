"use client";

import { useState } from "react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "타이머를 켜두고 다른 탭으로 이동하거나 브라우저를 닫아도 시간이 기록되나요?",
    a: "네, 타이머는 서버 기준 시각과 로컬 타임스탬프를 동기화하여 측정되므로 다른 탭으로 이동하더라도 시간이 정확하게 유지됩니다. 다만 브라우저 창을 완전히 닫은 상태에서는 알림음이 울리지 않으므로, 창을 띄워두거나 백그라운드 탭으로 유지하시는 것을 권장합니다."
  },
  {
    q: "AI 성과 분석 기능은 유료인가요? 어떤 API 키가 필요한가요?",
    a: "기본적인 할 일 등록, 뽀모도로 타이머, 성과 지표 집계, 차트, JSON/CSV 백업은 API 키 없이 100% 무료로 이용하실 수 있습니다. '✨ 달성 결과 분석하기' 기능만 회원 본인의 Google Gemini API 키(Gemini 2.5 Flash / Flash-Lite 권장)를 사용하며, 무료 요금제 키로도 충분히 매일 분석을 실행하실 수 있습니다."
  },
  {
    q: "등록한 할 일과 집중 시간 데이터는 어디에 저장되나요?",
    a: "모든 작업 데이터는 회원님의 계정에 귀속된 클라우드 데이터베이스에 안전하게 암호화되어 저장됩니다. 원자적 리비전(Revision) 락을 적용하여 PC, 태블릿, 모바일 등 기기를 변경해도 데이터 유실이나 덮어쓰기 없이 실시간으로 이어집니다."
  },
  {
    q: "기록을 엑셀이나 스프레드시트에서 열어볼 수 있나요?",
    a: "상단 툴바의 'CSV' 버튼을 클릭하시면 현재 선택된 날짜와 분류 범위의 할 일 목록, 예상 시간, 실제 집중 시간, 우선순위, 완료 여부가 포함된 CSV 파일이 즉시 다운로드됩니다. 엑셀, 한셀, 구글 스프레드시트, 노션 등에서 손쉽게 불러와 분석하실 수 있습니다."
  }
];

export function TaskPlannerGuideView({ onStartPlanning }: { onStartPlanning?: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="task-guide-container" style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* 1. 상단 히어로 헤더 */}
      <div
        style={{
          background: "linear-gradient(135deg, #161d2b 0%, #1e293b 100%)",
          border: "1px solid #253046",
          borderRadius: "16px",
          padding: "36px 32px",
          marginBottom: "28px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span
            style={{
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              display: "grid",
              placeItems: "center",
              fontSize: "20px",
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)"
            }}
          >
            ✓
          </span>
          <span
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700
            }}
          >
            {APP_VERSION} 스마트 매트릭스 가이드북
          </span>
        </div>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 12px",
            letterSpacing: "-0.6px"
          }}
        >
          {APP_NAME} 완전 정복 가이드
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#94a3b8",
            margin: 0,
            lineHeight: 1.7,
            maxWidth: "760px"
          }}
        >
          작은 계획을 세우고, 뽀모도로 포커스 타이머로 몰입하며, 실시간 성과 지표와 Gemini AI의 생산성 분석을 통해
          어제보다 더 높은 성취를 달성하는 5단계 파이프라인 매뉴얼입니다.
        </p>

        {onStartPlanning && (
          <button
            onClick={onStartPlanning}
            style={{
              marginTop: "22px",
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
              transition: "all 0.15s ease"
            }}
          >
            대시보드에서 바로 시작하기 →
          </button>
        )}
      </div>

      {/* 2. 5단계 파이프라인 프로세스 인포그래픽 */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <span style={{ fontSize: "20px" }}>⚡</span>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            생산성 극대화 5단계 파이프라인
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          {/* Step 1 */}
          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "20px 18px",
              position: "relative",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(99, 102, 241, 0.2)",
                color: "#818cf8",
                display: "grid",
                placeItems: "center",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
                border: "1px solid rgba(99, 102, 241, 0.4)"
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
              할 일 계획 &amp; 우선순위
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              오늘 수행할 할 일을 등록하고 분류(업무·개인·학습), 우선순위(높음·보통·낮음), 예상 소요 시간을 설정합니다.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "20px 18px",
              position: "relative",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.2)",
                color: "#34d399",
                display: "grid",
                placeItems: "center",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
                border: "1px solid rgba(16, 185, 129, 0.4)"
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
              뽀모도로 포커스 타이머
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              할 일 카드의 ▶ 버튼을 눌러 25분 집중을 시작합니다. 휴식 모드 전환과 일시정지로 최상의 리듬을 유지합니다.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "20px 18px",
              position: "relative",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                display: "grid",
                placeItems: "center",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
                border: "1px solid rgba(59, 130, 246, 0.4)"
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
              성과 지표 &amp; 시간대 차트
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              완료율(%), 총 누적 집중 시간, 예측 정확도(%), 시간대별 완료 막대 차트가 한눈에 실시간으로 집계됩니다.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "20px 18px",
              position: "relative",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(168, 85, 247, 0.2)",
                color: "#c084fc",
                display: "grid",
                placeItems: "center",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
                border: "1px solid rgba(168, 85, 247, 0.4)"
              }}
            >
              4
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
              Gemini AI 성과 분석
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              '달성 결과 분석하기' 버튼으로 오늘 완료한 작업의 집중 패턴을 AI가 정밀 분석하고 개선 피드백을 제시합니다.
            </p>
          </div>

          {/* Step 5 */}
          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "20px 18px",
              position: "relative",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.2)",
                color: "#fbbf24",
                display: "grid",
                placeItems: "center",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
                border: "1px solid rgba(245, 158, 11, 0.4)"
              }}
            >
              5
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
              성과 노트 &amp; JSON/CSV 백업
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              하루 회고 노트를 작성하고, 전체 작업 기록을 JSON으로 안전하게 백업하거나 CSV 엑셀 파일로 추출합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 3. 생산성 극대화 4대 골든 팁 */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <span style={{ fontSize: "20px" }}>🎯</span>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            생산성 극대화 4대 골든 팁
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)"
            }}
          >
            <span style={{ fontSize: "20px", display: "block", marginBottom: "8px" }}>⏱️</span>
            <strong style={{ fontSize: "14px", color: "#ffffff", display: "block", marginBottom: "6px" }}>
              25/5 뽀모도로 리듬 유지
            </strong>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
              인간의 뇌가 초집중을 유지할 수 있는 최적의 시간은 25분입니다. 4회 집중 후 15분 긴 휴식을 가지면 하루 종일 지치지 않습니다.
            </p>
          </div>

          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)"
            }}
          >
            <span style={{ fontSize: "20px", display: "block", marginBottom: "8px" }}>🎯</span>
            <strong style={{ fontSize: "14px", color: "#ffffff", display: "block", marginBottom: "6px" }}>
              예상 시간 오차 0% 도전
            </strong>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
              할 일 등록 시 예상 소요시간을 꼼꼼하게 입력해보세요. 실제 타이머와 비교한 '예측 정확도' 지표가 올라갈수록 업무 효율이 폭발합니다.
            </p>
          </div>

          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)"
            }}
          >
            <span style={{ fontSize: "20px", display: "block", marginBottom: "8px" }}>🔥</span>
            <strong style={{ fontSize: "14px", color: "#ffffff", display: "block", marginBottom: "6px" }}>
              우선순위 높음은 하루 최대 3개
            </strong>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
              모든 작업이 중요하면 아무것도 완료하지 못합니다. 오늘 반드시 끝내야 할 핵심 과업 3개만 '높음'으로 지정해 먼저 처리하세요.
            </p>
          </div>

          <div
            style={{
              background: "#161d2b",
              border: "1px solid #253046",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)"
            }}
          >
            <span style={{ fontSize: "20px", display: "block", marginBottom: "8px" }}>📝</span>
            <strong style={{ fontSize: "14px", color: "#ffffff", display: "block", marginBottom: "6px" }}>
              퇴근 전 성과 노트 회고
            </strong>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
              오늘 잘한 점 1가지, 아쉬웠던 점 1가지, 내일 첫 번째로 착수할 일 1가지를 성과 노트에 남기면 내일 아침 즉시 몰입할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 자주 묻는 질문 (FAQ) 아코디언 */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <span style={{ fontSize: "20px" }}>❓</span>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: "#161d2b",
                  border: "1px solid #253046",
                  borderRadius: "10px",
                  overflow: "hidden",
                  transition: "all 0.2s ease"
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ color: "#818cf8", fontSize: "18px", transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 20px 18px",
                      fontSize: "13px",
                      color: "#94a3b8",
                      lineHeight: 1.7,
                      borderTop: "1px solid #1e293b",
                      paddingTop: "14px"
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 회원 본인 API 키 직접 연동 보안 원칙 배너 */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "14px",
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)"
        }}
      >
        <span style={{ fontSize: "36px", flexShrink: 0 }}>🛡️</span>
        <div>
          <strong style={{ fontSize: "15px", color: "#ffffff", display: "block", marginBottom: "4px" }}>
            회원 본인 소유 격리 &amp; 직접 연동 절대 원칙
          </strong>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
            AIMaster 플랫폼의 모든 자동화 프로그램은 운영자나 타인의 API 키로 대리 처리하지 않습니다.
            회원님이 직접 발급받으신 Gemini API 키를 안전하게 연동하여 사용하며, 생성된 모든 분석 데이터는 본인 계정에만 격리 보존됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
