"use client";

import React, { useState } from "react";
import {
  BookOpen,
  X,
  Sparkles,
  Upload,
  ListOrdered,
  Layers,
  Palette,
  FileCheck,
  Download,
  KeyRound,
  Layout,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUIDE_SECTIONS = [
  { id: "start", num: "01", label: "시작하기", icon: HelpCircle },
  { id: "sources", num: "02", label: "자료 넣기", icon: Upload },
  { id: "outline", num: "03", label: "목차", icon: ListOrdered },
  { id: "depth", num: "04", label: "정리 수준", icon: Layers },
  { id: "design", num: "05", label: "디자인", icon: Palette },
  { id: "build", num: "06", label: "만들고 검토하기", icon: FileCheck },
  { id: "export", num: "07", label: "내려받기 · 인쇄 · 공유", icon: Download },
  { id: "key", num: "08", label: "AI 연결과 키", icon: KeyRound },
  { id: "layout", num: "09", label: "화면 다루기", icon: Layout },
  { id: "limits", num: "10", label: "안 되는 것들", icon: AlertTriangle },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState("start");

  if (!isOpen) return null;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(`guide-sec-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[85vh] max-h-[820px]">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">이용 가이드</h2>
              <p className="text-[11px] text-slate-500">
                문서 한 뭉치를 전자책 한 권으로 완성하는 완벽 안내서
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 (좌측 네비 + 우측 도큐먼트) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 좌측 10개 탭 사이드 네비게이션 */}
          <nav className="w-56 border-r border-slate-200 bg-slate-50/50 p-2.5 space-y-1 overflow-y-auto shrink-0 hidden sm:block">
            {GUIDE_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono ${
                      isActive ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {sec.num}
                  </span>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 우측 가이드 본문 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar text-slate-800 text-xs leading-relaxed">
            {/* 01 시작하기 */}
            <section id="guide-sec-start" className="space-y-3 pt-2">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                01. 시작하기
              </h3>
              <p className="text-slate-700 font-medium">
                <strong className="text-slate-950 font-black">글을 대신 써 주는 앱이 아닙니다.</strong> 이미 쓰신 글과 문서를 남이 읽기 좋은 한 권으로 바꿔 주는 앱입니다. 없는 내용을 지어내지 않고, 가지고 계신 자료 안에 있는 것만 다시 세웁니다.
              </p>
              <p className="text-slate-600">
                왼쪽에 자료를 넣고, 가운데에서 어떻게 정리할지 정하고, 오른쪽 미리보기를 보며 다듬은 뒤 내려받습니다. <strong className="text-slate-900">오른쪽 미리보기는 내려받게 될 파일 그 자체입니다.</strong> 여기서 보이는 그대로 나오므로 받아 보고 놀랄 일이 없습니다.
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                <li>
                  <strong>자료 넣기</strong> — 파일을 끌어다 놓거나, 웹 주소를 붙여 넣거나, 본문을 직접 붙여 넣습니다. 셋을 섞어도 한 권으로 묶입니다.
                </li>
                <li>
                  <strong>목차 확인</strong> — 어떤 순서로 어떤 장이 될지 만들기 전에 보입니다. 제목은 그 자리에서 고칩니다.
                </li>
                <li>
                  <strong>구성 정하기</strong> — 제목·저자·정리 수준을 정하고 디자인 조합을 고릅니다.
                </li>
                <li>
                  <strong>생성과 검토</strong> — 만든 뒤 확대해서 읽어 보고, 마음에 들지 않는 장만 고치거나 다시 만듭니다.
                </li>
                <li>
                  <strong>내려받기</strong> — 상단바 오른쪽에서 HTML 또는 EPUB, 웹 배포용으로 받습니다.
                </li>
              </ol>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-[11px] font-medium">
                💡 작업 내용은 이 브라우저에 자동으로 저장됩니다. 창을 닫았다 열면 이어서 할 수 있습니다.
              </div>
            </section>

            {/* 02 자료 넣기 */}
            <section id="guide-sec-sources" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                02. 자료 넣기
              </h3>
              <p>세 갈래가 있고, 섞어서 넣어도 됩니다. 넣은 순서가 곧 책의 순서입니다.</p>
              <h4 className="font-bold text-slate-900 text-xs">파일 올리기</h4>
              <p>
                TXT · MD · DOCX 등을 읽습니다. 파일은 기기 안에서 직접 읽고 서버로 보내지 않습니다.
              </p>
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">파일당 용량</span>
                  <strong className="text-xs text-slate-800">최대 20MB</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">합계 글자 수</span>
                  <strong className="text-xs text-slate-800">200,000자</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">권장 장 수</span>
                  <strong className="text-xs text-slate-800">최대 80장</strong>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-xs">웹 주소로 가져오기</h4>
              <p>
                기사·블로그·문서 주소를 한 줄에 하나씩 넣고 <strong>주소 분석</strong>을 누르면 본문만 골라 옵니다. 한 번에 최대 12개까지 가능하며, 읽지 못한 주소가 있으면 목록에 넣기 전에 먼저 알려 주고, 실패한 주소만 입력창에 남겨 고쳐 넣게 합니다.
              </p>
              <h4 className="font-bold text-slate-900 text-xs">직접 붙여넣기</h4>
              <p>
                자동 수집이 막히는 자료를 위한 길입니다. 이름(선택)과 본문 50자 이상을 넣으면 파일과 똑같이 다뤄집니다.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>유튜브 자막 안내:</strong> 유튜브는 영상 주소만으로는 자막을 가져올 수 없습니다. 붙여넣기 칸의 <strong>유튜브 자막 추출 스크립트</strong>를 복사해 영상 페이지의 F12 → Console에 붙여 넣으면 자막 전문이 클립보드에 바로 담깁니다.
              </div>
            </section>

            {/* 03 목차 */}
            <section id="guide-sec-outline" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                03. 목차
              </h3>
              <p>
                자료를 넣으면 바로 목차가 생깁니다. 여기 보이는 것이 그대로 책의 장이 되므로, 만들기 전에 확인하고 고치는 것이 가장 빠릅니다.
              </p>
              <ul className="space-y-2 list-disc pl-5">
                <li>
                  <strong>순서 정하기:</strong> 파일 이름 앞에 번호를 붙이면 (01_서론.docx, 02_본론.docx) 그 번호대로 놓입니다.
                </li>
                <li>
                  <strong>장 나누기:</strong> 문서 안에 소제목(#, ##)이 있으면 그 자리에서 나눕니다. 소제목이 없으면 자료 하나가 한 장이 되고, 너무 길면 문단 경계에서 나눠 (2)를 붙입니다.
                </li>
                <li>
                  <strong>제목 고치기:</strong> 목록의 제목을 직접 고치면 그대로 장 제목이 됩니다. <strong>제목 되돌리기</strong>로 처음 상태로 돌릴 수 있습니다.
                </li>
                <li>
                  <strong>AI 목차 제안:</strong> 소제목이 없을 때 AI가 각 장의 앞부분을 읽고 매력적인 제목을 추천합니다.
                </li>
              </ul>
            </section>

            {/* 04 정리 수준 */}
            <section id="guide-sec-depth" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                04. 정리 수준
              </h3>
              <p>이 선택 하나로 결과물의 성격이 완전히 달라집니다. 세 가지 중 하나를 고릅니다.</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-2.5 font-bold">정리 모드</th>
                      <th className="p-2.5 font-bold">AI가 하는 일</th>
                      <th className="p-2.5 font-bold">추천 대상</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 font-bold text-indigo-700">상세 정리</td>
                      <td className="p-2.5">맥락과 사례까지 충실하게 풀어 씁니다. 한 구간이 2~4개 장이 됩니다.</td>
                      <td className="p-2.5">강의안, 가이드북</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">핵심 요약</td>
                      <td className="p-2.5">중요한 내용만 남기고 줄입니다. 한 구간이 1~2개 장이 됩니다.</td>
                      <td className="p-2.5">브리핑, 정리 노트</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-800">원문 그대로</td>
                      <td className="p-2.5">낱말은 그대로 두고 서식(소제목, 목록, 인용)만 다시 세웁니다.</td>
                      <td className="p-2.5">내 글, 인터뷰, 회의록</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 05 디자인 */}
            <section id="guide-sec-design" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                05. 디자인
              </h3>
              <p>
                여기서 정하는 값은 <strong>책을 처음 열었을 때의 기본 모습</strong>입니다. 읽는 사람은 내려받은 책 안에서 언제든 다시 바꿀 수 있습니다.
              </p>
              <ul className="space-y-1.5 list-disc pl-5">
                <li>
                  <strong>디자인 조합 10종:</strong> 문학 에세이, 고전 문고, 출판 원고, 실용 안내서, 기술 문서, 야간 독서, 연구 노트, 접근성 우선, 검증 워크북, 다크 스튜디오.
                </li>
                <li>
                  <strong>21종 테마:</strong> 밝은 계열 12종, 어두운 계열 8종, 고대비 잉크 1종.
                </li>
                <li>
                  <strong>5종 서체:</strong> 본고딕, 본명조, 리디바탕, 마루부리, 페이퍼로지.
                </li>
                <li>
                  <strong>지면 꾸밈:</strong> 클래식(선과 여백만), 스튜디오(배지와 강조 막대).
                </li>
                <li>
                  <strong>표지 4대 템플릿:</strong> 체크리스트형, 대비형, 요점 나열형, 인물 대비형 프롬프트 원클릭 복사.
                </li>
              </ul>
            </section>

            {/* 06 만들고 검토하기 */}
            <section id="guide-sec-build" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                06. 만들고 검토하기
              </h3>
              <p>
                <strong>전자책 생성하기</strong>를 누르면 각 장을 순서대로 생성합니다. 진행 막대로 상태가 표시되며, 중단 시에도 그때까지 만든 장을 버리지 않고 <strong>이어서 생성</strong>할 수 있습니다.
              </p>
              <p>
                미리보기의 확대 아이콘을 누르면 전체화면으로 펼쳐집니다. <strong>책 고치기</strong> 단계에서는 장 제목, 요약, 본문을 직접 고치고 순서를 바꾸거나, 마음에 들지 않는 장만 <strong>이 장만 다시 생성</strong>할 수 있습니다.
              </p>
            </section>

            {/* 07 내려받기 · 인쇄 · 공유 */}
            <section id="guide-sec-export" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                07. 내려받기 · 인쇄 · 공유
              </h3>
              <div className="space-y-2">
                <p>
                  <strong>1. HTML:</strong> 단 1개의 파일로 받습니다. 표지·목차·검색·테마·서체·인쇄가 모두 내장되어 인터넷 없이 브라우저에서 바로 열립니다. <strong>API 키는 파일에 들어가지 않으므로</strong> 남에게 안심하고 보내셔도 됩니다.
                </p>
                <p>
                  <strong>2. EPUB:</strong> 전자책 앱과 단말기(리디, 크레마 등)에서 읽을 때 사용하는 표준 파일입니다.
                </p>
                <p>
                  <strong>3. 인쇄 / PDF:</strong> 브라우저 인쇄 창을 열어 표지가 첫 쪽에 오고 장마다 새 쪽에서 시작되도록 인쇄 규칙이 적용됩니다. 대상에서 <strong>PDF로 저장</strong>을 선택하세요.
                </p>
                <p>
                  <strong>4. 웹 배포용 ZIP:</strong> 압축을 풀어 Vercel Drop 등에 드래그 앤 드롭하면 즉시 나만의 전용 웹사이트 주소로 배포됩니다.
                </p>
              </div>
            </section>

            {/* 08 AI 연결과 키 */}
            <section id="guide-sec-key" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                08. AI 연결과 키
              </h3>
              <p>
                eBook Studio는 <strong>회원 본인의 Google Gemini API 키</strong>로만 동작합니다. 원문은 구글 AI에 안전하게 전송되며 다른 회원의 키나 운영자 키와 절대 섞이지 않습니다.
              </p>
              <p>
                구글 AI 스튜디오에서 키를 발급받아 <strong>AI 연결 설정</strong>에 넣으세요. 표준 키(AIza...)와 신규 인증 키(AQ...)를 모두 지원하며 공백과 줄바꿈은 자동으로 정돈됩니다.
              </p>
            </section>

            {/* 09 화면 다루기 */}
            <section id="guide-sec-layout" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                09. 화면 다루기
              </h3>
              <p>
                좌측에서 <strong>01 원본 문서</strong>, <strong>02 전자책 구성</strong>, <strong>03 실시간 뷰어</strong> 단계를 자유롭게 오갈 수 있으며, 우측의 뷰어는 모바일(375px), 태블릿(768px), 데스크톱 폭으로 반응형 전환을 지원합니다. 모든 변경 사항은 실시간으로 저장됩니다.
              </p>
            </section>

            {/* 10 안 되는 것들 */}
            <section id="guide-sec-limits" className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                10. 안 되는 것들 (주의사항)
              </h3>
              <ul className="space-y-2 list-disc pl-5 text-rose-700">
                <li>
                  <strong>스캔한 PDF:</strong> 글자가 이미지로 되어 있어 OCR이 필요합니다. 텍스트가 없는 스캔본은 읽지 못합니다.
                </li>
                <li>
                  <strong>이미지·도형·발표자 노트:</strong> 원본 문서의 복잡한 도형 레이아웃은 가져오지 않으며 텍스트 글자만 가져옵니다.
                </li>
                <li>
                  <strong>암호 걸린 파일:</strong> 암호를 해제한 후 업로드해야 합니다.
                </li>
                <li>
                  <strong>유튜브 직접 수집:</strong> 유튜브는 주소만으로는 자막을 긁어올 수 없으므로, 자막 추출 스크립트로 복사해 넣어주세요.
                </li>
              </ul>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
                ⚠️ <strong>AI가 정리한 내용은 원문과 대조해 보세요:</strong> 요약이나 재구성 과정에서 뜻이 달라질 수 있습니다. 배포하기 전 오른쪽 미리보기에서 한 번은 직접 확인하시기 바랍니다.
              </div>
            </section>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50/70">
          <span className="text-[11px] text-slate-500 font-medium">
            eBook Studio — 당해 연도(2026년) 기준 자동 출판 엔진
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition"
          >
            가이드 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
