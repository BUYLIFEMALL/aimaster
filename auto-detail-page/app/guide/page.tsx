import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export const metadata = {
  title: "연동 & 사용 매뉴얼 — AI 상세페이지 자동생성기",
  description: "이커머스 셀러를 위한 상세페이지 기획 가이드, 플랫폼별 권장 이미지 규격 매트릭스, 전환율 극대화 7대 수칙 및 FAQ",
};

const SPEC_MATRIX = [
  {
    platform: "쿠팡 (Coupang)",
    badge: "로켓배송 최적화",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    width: "860px (권장)",
    imageRatio: "1:1 정방형 (대표) / 세로형 (본문)",
    keySection: "원가 대비 할인율, 로켓배송 배지, 한정수량 긴박감, 베스트 리뷰 하이라이트",
    focus: "즉각적인 구매 전환 & 가격 혜택 극대화",
  },
  {
    platform: "네이버 스마트스토어",
    badge: "브랜드 스토리텔링",
    badgeColor: "bg-green-100 text-green-700 border-green-200",
    width: "860px (권장) / 최대 1000px",
    imageRatio: "정방형 / 세로 스토리텔링 컷",
    keySection: "브랜드 철학, 원산지 소싱 스토리, 해시태그 클라우드, Q&A 아코디언, 사용법 가이드",
    focus: "네이버 검색 SEO 최적화 & 고객 신뢰감 형성",
  },
  {
    platform: "프리미엄 & 럭셔리 몰",
    badge: "브랜드 헤리티지",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    width: "1000px ~ 1200px (와이드)",
    imageRatio: "16:9 와이드 비주얼 & 고해상도 매크로 컷",
    keySection: "브랜드 역사/철학, 컬렉션 스토리, 장인정신, 동영상 임베드, 언박싱 경험, 인플루언서 추천",
    focus: "고급스러운 감성 전달 & 브랜드 가치 극대화",
  },
];

const SEVEN_RULES = [
  {
    number: "01",
    title: "첫 3초 후킹 (Hooking) 헤드카피",
    desc: "고객이 상세페이지를 열었을 때 가장 먼저 마주하는 인트로에서 고객이 겪고 있는 고통(Pain Point)을 직격하는 강력한 질문과 카피를 배치하세요.",
    tag: "첫인상 결정",
  },
  {
    number: "02",
    title: "고객의 결핍과 문제의식 공감",
    desc: "제품의 스펙을 먼저 나열하지 말고, 고객이 '맞아, 나도 저런 불편함이 있었어'라고 깊이 공감할 수 있는 일상 속 상황을 시각화하세요.",
    tag: "공감대 형성",
  },
  {
    number: "03",
    title: "극적인 전후 비교 (Before & After)",
    desc: "우리 제품을 사용하기 전과 사용한 후의 명확한 차이를 수치나 이미지로 직관적으로 보여주어 기대 심리를 자극하세요.",
    tag: "직관적 효능",
  },
  {
    number: "04",
    title: "수치로 증명하는 객관적 신뢰 데이터",
    desc: "‘좋은 제품’이라는 주관적 표현 대신 '누적 판매량 3만개+', '고객 만족도 98.7%', '재구매율 67%' 등 구체적 숫자를 제시하세요.",
    tag: "신뢰도 극대화",
  },
  {
    number: "05",
    title: "전문가 인증 & 기관 검증 배지",
    desc: "KC인증, HACCP, 피부 저자극 테스트 완료 등 공인 기관의 검증 배지를 전진 배치하여 의구심을 완전히 해소합니다.",
    tag: "안전성 보증",
  },
  {
    number: "06",
    title: "생생한 실제 고객 리뷰 & 언박싱",
    desc: "별점 5점짜리 대표 후기 3개와 실제 소비자가 경험한 핵심 포인트를 강조하여 사회적 증거(Social Proof)를 확보하세요.",
    tag: "사회적 증거",
  },
  {
    number: "07",
    title: "구매 불안을 없애는 3대 보장 정책",
    desc: "빠른 배송 일정 안내, 수령 후 무료 반품/교환 조건, 무상 A/S 보증을 명확히 명시하여 결제 직전의 망설임을 제거합니다.",
    tag: "마지막 허들 제거",
  },
];

const FAQ_LIST = [
  {
    q: "상세페이지를 생성하려면 어떤 API 키가 필요한가요?",
    a: "상세페이지 기획 및 카피라이팅 생성을 위해 'Anthropic Claude' API 키가 필수로 등록되어 있어야 합니다. 제품 사진이 없어서 AI로 이미지를 자동 생성하려면 'Google Gemini' API 키도 함께 등록해 주시면 됩니다. 상단 메뉴의 [API 키 설정]에서 손쉽게 연동하실 수 있습니다.",
  },
  {
    q: "쿠팡이나 스마트스토어에 바로 업로드할 수 있나요?",
    a: "네! 생성 완료된 미리보기 화면에서 [고해상도 이미지(PNG) 내보내기] 또는 [HTML 코드 복사]를 지원합니다. 스마트스토어의 스마트에디터ONE이나 쿠팡 상품등록 페이지에 이미지 통등록 또는 HTML로 손쉽게 등록하실 수 있습니다.",
  },
  {
    q: "AI 이미지 생성 시 비용이나 크레딧이 발생하나요?",
    a: "AIMaster는 회원의 자체 API 키를 사용하는 BYOK(Bring Your Own Key) 원칙을 따릅니다. 사용하시는 Gemini API 플랜의 정책에 따라 무료 할당량 내에서 이용하시거나 구글 클라우드 계정에 소액의 API 비용이 직접 청구됩니다. AIMaster는 별도의 수수료를 부과하지 않습니다.",
  },
  {
    q: "생성된 상세페이지의 저작권과 상업적 이용은 가능한가요?",
    a: "회원님이 입력하신 정보와 본인의 API 키로 생성된 모든 상세페이지 카피, 디자인 레이아웃 및 생성 이미지는 전적으로 회원님에게 소유권이 있으며, 스마트스토어, 쿠팡, 자사몰, 와디즈 등 모든 상업적 채널에서 자유롭게 영리 목적으로 사용하실 수 있습니다.",
  },
  {
    q: "기존에 촬영해 둔 제품 실사 사진을 사용할 수 있나요?",
    a: "물론입니다! [제품 이미지] 섹션에서 최대 5장까지 보유하고 계신 제품 실사 사진을 드래그앤드롭으로 바로 업로드하실 수 있습니다. 실사 이미지가 있으면 AI가 사진의 구도와 특징을 분석하여 더욱 현실적이고 정확한 맞춤형 카피를 작성합니다.",
  },
];

export default function GuidePage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* ── 1. 상단 히어로 배너 ── */}
      <section className="studio-hero p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
              <span>📖 공식 사용자 매뉴얼</span>
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-amber-300">{APP_VERSION}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              상세페이지 완벽 기획 & 플랫폼별 입점 가이드북
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              쿠팡 · 스마트스토어 · 프리미엄 몰의 권장 규격부터 매출을 3배 끌어올리는 7대 전환 수칙까지 한눈에 확인하세요.
            </p>
          </div>

          <Link
            href="/"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs sm:text-sm font-bold shadow-lg hover:bg-blue-50 transition-all hover:scale-105 active:scale-95"
          >
            <span>🛍️ 상세페이지 제작하기</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── 2. 4단계 제작 워크플로우 ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>🚀</span>
            <span>AI 상세페이지 4단계 제작 프로세스</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">초보 셀러도 3분 만에 마스터</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="guide-card border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">STEP 01</span>
              <span className="text-xl">🎯</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">템플릿 선택</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              입점할 플랫폼(쿠팡, 네이버 스마트스토어, 럭셔리 브랜드몰)에 적합한 기획 구조를 선택합니다.
            </p>
          </div>

          <div className="guide-card border-l-4 border-l-indigo-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">STEP 02</span>
              <span className="text-xl">📸</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">스펙 & 이미지 등록</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              제품 실사 사진을 업로드하거나 Gemini AI로 스튜디오 퀄리티의 제품 컷을 즉시 생성합니다.
            </p>
          </div>

          <div className="guide-card border-l-4 border-l-amber-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">STEP 03</span>
              <span className="text-xl">📊</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">신뢰 & 보장 정보 입력</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              누적 판매량, 만족도, KC인증, 배송·환불 정책 등 고객의 의구심을 해소할 신뢰 데이터를 입력합니다.
            </p>
          </div>

          <div className="guide-card border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">STEP 04</span>
              <span className="text-xl">✨</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">AI 카피 & 원클릭 출력</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Claude가 최적의 세일즈 카피를 완성하면, 실시간 미리보기 후 이미지(PNG) 또는 HTML로 내보냅니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. 플랫폼별 이미지 규격 & 템플릿 매트릭스 ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📐</span>
            <span>플랫폼별 권장 규격 & 템플릿 매트릭스</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            각 이커머스 마켓플레이스별 최적 가로 해상도와 핵심 강조 요소 비교표입니다.
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">플랫폼 및 템플릿</th>
                <th className="py-3 px-4">권장 가로폭</th>
                <th className="py-3 px-4">이미지 비율</th>
                <th className="py-3 px-4">핵심 기획 섹션</th>
                <th className="py-3 px-4">전환 초점</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SPEC_MATRIX.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="space-y-1">
                      <div>{item.platform}</div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-blue-700 whitespace-nowrap">{item.width}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{item.imageRatio}</td>
                  <td className="py-3.5 px-4 leading-relaxed text-slate-600 min-w-[220px]">{item.keySection}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 min-w-[160px]">{item.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. 전환율 극대화 7대 기획 수칙 ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>💡</span>
            <span>이커머스 상세페이지 전환율 7대 황금 수칙</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            수만 명의 상위 1% 파워셀러들이 실전에서 증명한 설득 구조입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SEVEN_RULES.map((rule, idx) => (
            <div key={idx} className="guide-card flex items-start gap-3.5">
              <span className="text-xl font-black text-blue-600 bg-blue-50 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                {rule.number}
              </span>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{rule.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {rule.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. 자주 묻는 질문 (FAQ 5종) ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>❓</span>
            <span>자주 묻는 질문 (FAQ)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            API 연동, 이미지 규격, 상업적 사용 권한에 대해 가장 많이 묻는 내용입니다.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq, idx) => (
            <details
              key={idx}
              className="group bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs transition-all open:ring-1 open:ring-blue-400"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-slate-900 text-xs sm:text-sm list-none select-none">
                <span className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-black">Q{idx + 1}.</span>
                  <span>{faq.q}</span>
                </span>
                <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 6. 하단 바로가기 푸터 카드 ── */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">API 키가 아직 연동되지 않으셨나요?</h3>
          <p className="text-xs text-slate-500 mt-1">
            Anthropic Claude 키를 등록하시면 즉시 무제한 상세페이지 자동 생성을 시작하실 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
          >
            🔑 API 키 설정하기
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200 shadow-xs transition-all"
          >
            🛍️ 제작 스튜디오로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
