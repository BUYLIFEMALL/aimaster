"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "AI 회의록에서 「받아쓰기 시작」을 눌렀는데 마이크 오류가 나요.",
    a: "대부분 ① 마이크가 PC에 연결되지 않았거나 꺼져 있는 경우 ② 크롬이 마이크를 켜기 전부터 실행 중이라 새 장치를 못 본 경우 ③ 이 사이트의 마이크가 「차단」된 경우입니다. 위 「🎤 마이크 연결·허용 방법」의 체크 1~4를 순서대로 확인하고, 마이크를 새로 연결했다면 주소창에 chrome://restart 를 입력해 크롬을 다시 켠 뒤 시도해 주세요.",
  },
  {
    q: "회의록 받아쓰기와 요약에 비용이 드나요?",
    a: "받아쓰기는 브라우저(크롬·엣지·사파리)의 음성 인식으로 처리해 비용이 없습니다. 「정지」 뒤 만드는 AI 요약만 회원 본인 AI 키(Gemini·OpenAI·Claude 중 하나)로 1회 호출하며, 보통 1원 안팎입니다.",
  },
  {
    q: "정지했는데 요약 칸이 비어 있어요.",
    a: "녹취가 짧으면(약 20초 미만) 자동 요약을 건너뛰고 파란 안내 띠에 「요약 만들기」 버튼이 나옵니다. 버튼을 누르면 바로 요약합니다. 본인 AI 키가 등록되지 않았다면 「API키등록·플랫폼연동」에서 먼저 등록해 주세요.",
  },
  {
    q: "워크스페이스에 작성한 문서는 다른 회원에게 공개되나요?",
    a: "아닙니다. AI 업무 워크스페이스는 Supabase 전용 격리 스키마(aww)를 통해 회원별 고유 워크스페이스가 완벽히 분리되어 있습니다. 본인이 작성한 문서, 표, 회의록은 오직 본인에게만 보이며 안전하게 암호화 보관됩니다.",
  },
  {
    q: "AI 비서 기능은 어떤 API 키를 사용하며 어떻게 연동하나요?",
    a: "AIMaster의 최상위 원칙에 따라 회원의 본인 API 키(Anthropic Claude, OpenAI, Google Gemini)를 사용합니다. 좌측 메뉴 또는 상단 툴바의 [🔑 API키등록·플랫폼연동] 메뉴에서 키를 한 번만 등록하시면 모든 AI 비서 및 글쓰기 기능을 즉시 사용하실 수 있습니다.",
  },
  {
    q: "노션(Notion)이나 마크다운(Markdown) 문서를 가져올 수 있나요?",
    a: "네, 가능합니다. 페이지 빈 화면 또는 상단 도구의 [외부 파일 가져오기] 메뉴를 통해 마크다운(.md), CSV, HTML, 텍스트 파일을 즉시 워크스페이스 페이지로 변환하여 가져올 수 있습니다.",
  },
  {
    q: "데이터베이스는 어떤 보기(View) 형식을 지원하나요?",
    a: "스프레드시트 형태의 기본 표(Table), 드래그앤드롭 칸반 보드(Board), 목록(List), 캘린더(Calendar), 타임라인(Timeline), 갤러리(Gallery) 등 총 12가지 뷰를 지원합니다. 같은 데이터베이스 안에서 탭 하나로 자유롭게 보기 전환이 가능합니다.",
  },
  {
    q: "작성한 내용을 예전 시점으로 되돌리거나 복원할 수 있나요?",
    a: "네. 페이지 우측 상단의 ⋯ (더보기) 메뉴에서 [버전 기록]을 열면 시간대별 수정 이력을 확인하고 원하는 시점으로 1초 만에 복원할 수 있습니다. 지운 문서는 좌측 메뉴 하단의 휴지통에서 30일간 보관되며 언제든 복원 가능합니다.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="aww-faq-section" aria-label="자주 묻는 질문">
      <div className="aww-faq-header">
        <span className="aww-faq-badge">FAQ</span>
        <h2>자주 묻는 질문</h2>
        <p>궁금한 점을 빠르고 명확하게 확인해 보세요.</p>
      </div>
      <div className="aww-faq-list">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className={`aww-faq-item ${isOpen ? "open" : ""}`}>
              <button
                type="button"
                className="aww-faq-question"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
              >
                <span className="aww-faq-q-icon">Q</span>
                <span className="aww-faq-q-text">{faq.q}</span>
                <span className="aww-faq-arrow" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="aww-faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
