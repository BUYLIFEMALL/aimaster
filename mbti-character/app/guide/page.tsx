import Link from "next/link";
import { CHARACTERS } from "@/lib/characters";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "캐릭코드(MBTI) 가이드북 - 16대 오리지널 캐릭터 도감 & 사용 매뉴얼",
  description: "캐릭코드 4단계 프로세스, 16대 오리지널 캐릭터 상세 도감, 7대 황금 수칙 및 FAQ 아코디언.",
};

const FAQ_ITEMS = [
  {
    q: "등장하는 16명의 캐릭터는 기존 애니메이션이나 웹툰의 캐릭터인가요?",
    a: "아닙니다. 캐릭코드의 16대 캐릭터(카이런, 노아, 레오나, 하루토 등)는 상업 플랫폼의 저작권 및 지식재산권을 철저히 준수하기 위해 AIMaster에서 100% 자체 기획·창작한 순수 오리지널 캐릭터입니다. 실존 작품의 저작권을 침해하지 않으므로 SNS 공유와 개인 활용이 완전히 자유롭습니다.",
  },
  {
    q: "AI 캐릭터 일러스트 생성을 위해 어떤 API 키가 필요한가요?",
    a: "회원님 본인의 Google Gemini API 키 한 개가 필요합니다. 로그인한 뒤 첫 화면의 「AI 캐릭터 일러스트 연동 설정」 칸이나 위쪽 [🔑 API키등록] 화면에 붙여 넣고 [저장]을 누르면 됩니다(발급 방법은 그 칸 아래 [📄 Google Gemini API 키 발급받기] 버튼). 그림은 1장 만들 때마다 회원님 Gemini 계정 요금으로 처리되며, 무료 한도·요금은 구글 정책에 따릅니다. 키가 없어도 검사와 캐릭터 결과는 볼 수 있고, 그림 생성 버튼만 키 등록 안내로 바뀝니다.",
  },
  {
    q: "카카오톡이나 인스타그램에 결과를 공유할 때 어떤 카드가 전송되나요?",
    a: "결과 화면 맨 아래 [카카오톡 공유] 또는 [링크 복사]를 누르면 캐릭터 이름·유형 코드·대표 대사가 담긴 카드가 전송됩니다. AI 그림을 만들어 둔 상태라면 그 그림이 카드에 들어가고, 그림이 없으면 기본 캐릭터 카드가 들어갑니다. 공유받은 사람도 결과 화면을 보려면 AIMaster 로그인이 필요합니다. 단, [💬 카카오톡 공유] 버튼은 회원님 본인 카카오 앱의 JavaScript 키를 메인 사이트 [API 설정](https://www.buylife.xyz/api-settings)의 「카카오 JavaScript 키」 칸에 한 번 등록해야 나타납니다(카카오 개발자 콘솔 [플랫폼 키 › JavaScript 키]에서 복사하고, 같은 화면 [JavaScript SDK 도메인]에 https://mbti-character.buylife.xyz 를 추가). 한 번 등록하면 타로점·성격코드·캐릭코드·카카오톡 뉴스레터에서 함께 쓰이고, 키가 없어도 [링크 복사] 공유는 그대로 됩니다.",
  },
  {
    q: "나의 성격검사 결과나 응답 내역이 다른 사용자에게 공개되나요?",
    a: "문항마다 고른 답은 서버에 저장하지 않고 브라우저에서 채점합니다. 결과 화면 주소에는 유형 코드와 4개 지표 비율(%)만 담깁니다. 다만 AI로 만든 캐릭터 그림은 카카오톡·링크 공유에 쓰기 위해 공개 주소로 저장되므로, 그 그림 주소(또는 공유 링크)를 받은 사람은 그림을 볼 수 있습니다. 그림 파일은 회원님 본인 폴더에만 저장되고 다른 회원이 지우거나 바꿀 수 없습니다.",
  },
  {
    q: "문항 응답 중 창을 닫거나 뒤로 가면 이전 상태가 유지되나요?",
    a: "검사(/test)는 클라이언트 상태로 가볍고 안전하게 구동되므로, 페이지를 새로고침하거나 벗어날 경우 처음부터 다시 20문항을 풀게 됩니다. 약 2분 정도 소요되는 간결한 검사이므로 집중할 수 있는 환경에서 한 번에 완료하시는 것을 권장합니다.",
  },
  {
    q: "그림은 언제 자동으로 만들어지나요? 원하지 않는 요금이 나가지는 않나요?",
    a: "Gemini 키를 등록한 회원이 20문항을 방금 끝내고 결과 화면에 처음 도착했을 때 딱 1장만 자동으로 만들어집니다(최대 30초). 결과 화면을 새로고침하거나 뒤로 가기·공유 링크·다른 프로그램의 「이어서 보기」로 들어온 경우에는 자동으로 만들지 않고, [✨ AI 캐릭터 이미지 생성하기] 또는 [🔄 이 스타일로 다시 생성] 버튼을 직접 눌렀을 때만 만듭니다. 버튼을 누를 때마다 1장씩 요금이 듭니다. 시간 초과 안내가 나오면 바로 다시 누르지 말고 Google AI Studio 사용량을 먼저 확인해 주세요.",
  },
  {
    q: "만든 그림은 얼마나 보관되나요?",
    a: "그림은 회원님 저장공간에 들어가며 AIMaster 보관 규칙을 따릅니다. 일반 회원은 만든 자료 합계 500MB까지, 만든 날부터 30일 뒤 자동 삭제 대상이고(공유했어도 같습니다) 저장 구독으로 늘릴 수 있습니다. 지난 그림을 모아 보는 목록 화면은 아직 없으므로, 오래 간직할 그림은 결과 화면에서 그림을 길게 누르거나 마우스 오른쪽 버튼으로 바로 저장해 두세요.",
  },
  {
    q: "PC와 휴대폰에서 같이 쓸 수 있나요?",
    a: "네. 같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기(예: 다른 PC)에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다. 선호 화풍은 기기(브라우저)마다 따로 기억됩니다.",
  },
];

const GOLDEN_RULES = [
  {
    step: "01",
    title: "직관적이고 신속한 첫 느낌 선택",
    desc: "너무 깊이 고민하지 말고, 질문을 읽자마자 마음속에 가장 먼저 떠오르는 선택지를 고를 때 진정한 성향이 나타납니다.",
  },
  {
    step: "02",
    title: "이상적인 모습보다 평소의 일상 반영",
    desc: "‘내가 되고 싶은 모습’이 아니라 일상에서 ‘실제로 행동하고 결정하는 편안한 나’를 기준으로 선택하세요.",
  },
  {
    step: "03",
    title: "Gemini API 키 사전 연동",
    desc: "검사 시작 전 본인 Gemini 키를 등록해 두면, 검사를 끝내고 결과 화면에 도착했을 때 캐릭터 그림 1장이 자동으로 만들어집니다(최대 30초, 본인 키 요금 1장).",
  },
  {
    step: "04",
    title: "선호 화풍 스타일 사전 세팅",
    desc: "첫 화면(로그인 후)에서 귀여운 캐릭터·실물 캐릭터·귀여운 동물 캐릭터·애니메이션풍·수채화 일러스트 5가지 중 하나를 골라 두면 그 화풍으로 그려집니다. 선택은 지금 쓰는 브라우저에만 기억됩니다.",
  },
  {
    step: "05",
    title: "시그니처 대사와 역할 음미하기",
    desc: "단순한 4자리 알파벳을 넘어, 해당 캐릭터의 직업적 배경과 인생 철학이 담긴 시그니처 대사를 비교하며 성찰해 보세요.",
  },
  {
    step: "06",
    title: "카카오톡 공유·타로점 이어 보기",
    desc: "결과 화면 아래 [카카오톡 공유]·[링크 복사]로 내 캐릭터 카드를 보내고, 「타로점 3장 리딩으로 이어서 보기」로 내 캐릭터에 맞춘 질문을 타로점에 넘길 수 있습니다(카드 뽑기는 타로점에서 직접 눌러야 시작).",
  },
  {
    step: "07",
    title: "시즌별·환경 변화에 따른 주기적 재검사",
    desc: "새로운 프로젝트, 직무 전환, 심리적 전환점마다 2~3개월 주기로 재검사하여 나의 4차원 지표 변화를 추적해 보세요.",
  },
];

export default function GuidePage() {
  const charactersList = Object.values(CHARACTERS);

  return (
    <div className="w-full space-y-10 pb-16">
      {/* 1. 가이드북 히어로 섹션 */}
      <section className="atelier-hero p-6 sm:p-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#120d24]/80 border border-purple-500/40 shadow-sm mb-4">
          <span className="text-sm">📖</span>
          <span className="text-xs font-bold text-rose-200">
            캐릭코드 공식 사용 매뉴얼 & 캐릭터 도감
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight mb-3">
          캐릭코드 완벽 활용 가이드북
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          20문항의 융 심리유형 측정부터 16대 자체 제작 오리지널 캐릭터 매칭,<br className="hidden sm:inline" />
          그리고 Gemini AI 기반 고품질 일러스트 생성까지의 모든 노하우를 안내합니다.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/test"
            className="px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-all shadow-sm"
          >
            🎭 지금 바로 검사 시작하기
          </Link>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-[#120d24] text-slate-300 text-xs font-bold border border-[#2a1f4e] hover:bg-[#1c1536] transition-all"
          >
            ← 메인으로 돌아가기
          </Link>
        </div>
      </section>

      {/* 2. 4단계 프로세스 플로우 다이어그램 */}
      <section className="bg-[#120d24] rounded-2xl border border-[#2a1f4e] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              4단계 분석 & 생성 파이프라인
            </h2>
            <p className="text-xs text-slate-400">
              체계적이고 과학적인 4개 축 지표와 자체 창작 캐릭터 매칭 알고리즘
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-rose-400 tracking-wider">STEP 01</div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 mb-1">20문항 성격검사</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                4대 이분지표별 5문항씩 배정된 20개 질문에 직관적으로 응답합니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-rose-300/80 font-medium">⏱ 약 2분 소요</div>
          </div>

          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-violet-400 tracking-wider">STEP 02</div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 mb-1">4차원 점수화</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                외향/내향, 감각/직관, 사고/감정, 판단/인식 4개 축의 점수 비율을 정밀 산출합니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-violet-300/80 font-medium">🧭 실시간 정밀 연산</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-amber-400 tracking-wider">STEP 03</div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 mb-1">오리지널 캐릭터</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                산출된 16가지 유형 코드에 1:1 매핑된 자체 창작 고유 페르소나와 매칭됩니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-amber-300/80 font-medium">🎭 16인 독립 세계관</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-emerald-400 tracking-wider">STEP 04</div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 mb-1">AI 일러스트 & 공유</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                회원님 Gemini 키(나노바나나 이미지 모델)로 맞춤 그림을 만들고 카카오톡·링크로 공유합니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-emerald-300/80 font-medium">📱 카카오톡 공유·링크 복사</div>
          </div>
        </div>
      </section>

      {/* 3. 16대 MBTI 오리지널 캐릭터 매트릭스 도감 표 */}
      <section className="bg-[#120d24] rounded-2xl border border-[#2a1f4e] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                16대 오리지널 캐릭터 매트릭스 도감
              </h2>
              <p className="text-xs text-slate-400">
                각 유형의 특성이 가장 잘 드러나는 독자적 역할과 대표 대사를 확인하세요.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">총 16인</span>
        </div>

        <div className="overflow-x-auto">
          <table className="atelier-matrix-table">
            <thead>
              <tr>
                <th className="w-16">코드</th>
                <th className="w-24">캐릭터명</th>
                <th className="w-44">고유 역할 및 설정</th>
                <th>대표 시그니처 대사</th>
                <th className="w-28 text-center">핵심 특성</th>
              </tr>
            </thead>
            <tbody>
              {charactersList.map((c) => (
                <tr key={c.code} className="hover:bg-rose-500/20/20 transition-colors">
                  <td className="font-mono font-bold text-xs text-rose-400">
                    {c.code}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 font-bold text-slate-100">
                      <span>{c.emoji}</span>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-400">
                    {c.role}
                  </td>
                  <td className="text-xs italic text-slate-300">
                    &ldquo;{c.quote}&rdquo;
                  </td>
                  <td className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#1c1536] text-[11px] font-medium text-slate-300">
                      {c.traits?.[0] ?? "성향 특성"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 캐릭터 생성 극대화 7대 황금 수칙 */}
      <section className="bg-[#120d24] rounded-2xl border border-[#2a1f4e] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              캐릭코드 분석 & 생성 극대화 7대 황금 수칙
            </h2>
            <p className="text-xs text-slate-400">
              가장 높은 정확도와 만족스러운 일러스트 결과를 얻기 위한 핵심 가이드
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {GOLDEN_RULES.map((rule) => (
            <div key={rule.step} className="rule-card-atelier flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-900/30 to-indigo-900/20 text-rose-300 font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                {rule.step}
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-100 mb-0.5">
                  {rule.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 실무 FAQ 5종 아코디언 */}
      <section className="bg-[#120d24] rounded-2xl border border-[#2a1f4e] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">❓</span>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              자주 묻는 질문 (FAQ)
            </h2>
            <p className="text-xs text-slate-400">
              회원님들이 가장 궁금해하시는 질문과 답변입니다.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {FAQ_ITEMS.map((item, idx) => (
            <details
              key={idx}
              className="faq-atelier group p-4 border border-[#2a1f4e] rounded-xl [&_summary::-webkit-details-marker]:none"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-xs sm:text-sm text-slate-200 group-open:text-rose-600 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-rose-500 font-black">Q.</span>
                  <span>{item.q}</span>
                </div>
                <span className="text-slate-500 group-open:rotate-180 transition-transform text-xs">
                  ▼
                </span>
              </summary>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed pl-6 border-l-2 border-rose-500/30">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
