import Link from "next/link";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ALL_TESTS, GROUPS, isSensitive, testsOf } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const GOLDEN_RULES = [
  {
    step: "01",
    title: "직관적이고 즉각적인 솔직 응답",
    desc: "너무 오래 생각하지 말고, 질문을 읽었을 때 마음속에 가장 먼저 와닿는 선택지를 즉시 고르는 것이 자신의 고유 성향을 가장 정확하게 드러냅니다.",
  },
  {
    step: "02",
    title: "되고 싶은 나보다 편안한 진짜 나",
    desc: "‘내가 사회적으로 보여주고 싶은 이상적인 모습’이 아니라, 편안한 일상에서 ‘실제로 생각하고 반응하는 나’를 기준으로 답하세요.",
  },
  {
    step: "03",
    title: "맥락에 얽매이지 않고 일반적 상황 상상",
    desc: "최근 겪은 특수한 사건이나 극단적인 스트레스 상황에만 국한하지 말고, 전반적인 나의 평소 패턴을 떠올리며 응답하세요.",
  },
  {
    step: "04",
    title: "경계선(50% 내외) 점수 시 양방향 특성 종합 성찰",
    desc: "지표가 50% 부근인 경우 양쪽 성향을 모두 유연하게 쓰는 성숙한 상태입니다. 한쪽 성향에 갇히지 말고 두 해설을 함께 읽어보세요.",
  },
  {
    step: "05",
    title: "2종 이상 검사 완료로 AI 융합 프로필 해금",
    desc: "단일 검사만으로는 입체적 나를 보기 어렵습니다. 2종 이상의 검사를 완료하면 [종합 프로필]에서 교차 융합 해석을 받을 수 있습니다.",
  },
  {
    step: "06",
    title: "Gemini API 키 사전 연동으로 심층 피드백",
    desc: "회원 본인의 Gemini 키를 등록하면, 일반 검사 결과 요약을 넘어 내 성향의 상관관계와 잠재력까지 분석하는 AI 심층 리포트가 제공됩니다.",
  },
  {
    step: "07",
    title: "분기별(3~6개월) 주기적 재검사 추적",
    desc: "직무 환경, 대인관계, 인생 주기에 따라 성격 표현 방식은 변화합니다. 분기별로 재검사하여 [내 결과]의 시계열 변화 그래프를 확인하세요.",
  },
];

const FAQ_ITEMS = [
  {
    q: "여러 검사를 진행하면 [종합 프로필]에서 어떻게 융합되나요?",
    a: "[종합 프로필] 화면에서 검사별 반영 비중(제외·참고·중요·핵심)을 고른 뒤 [종합 프로필 만들기]를 누르면, 검사별 가장 최근 결과를 회원님 Gemini 키로 한 번 분석해 「공통으로 보이는 주제」「상황에 따라 달라 보이는 지점」「종합 강점」「앞으로 2주 실천 계획」「지난 결과와 달라진 점」을 글로 정리해 드립니다. 반영할 검사가 2종 이상이어야 버튼이 켜지며, 마음 상태 자기점검은 종합 프로필에 들어가지 않습니다. 고른 비중은 지금 쓰는 브라우저에만 기억됩니다.",
  },
  {
    q: "AI 심층 분석과 종합 프로필에는 왜 별도의 API 키가 필요한가요?",
    a: "AI 기능은 운영자나 다른 회원의 키로 대신 처리하지 않고 회원님 본인의 Google Gemini API 키로만 동작합니다. [AI 심층 분석 받기]와 [종합 프로필 만들기]는 누를 때마다 본인 키로 AI를 1회 호출하며, 요금·무료 한도는 구글 정책에 따릅니다. 검사 응답, 점수, 기본 해석(강점·주의할 점·활용 팁)은 AI를 쓰지 않으므로 키 없이도 볼 수 있습니다.",
  },
  {
    q: "마음 상태(스트레스·우울감 등) 점검 결과는 왜 자동 저장되지 않나요?",
    a: "마음 상태는 민감한 정보라서, 검사 직후에는 화면에만 보여 주고 서버에 저장하지 않습니다(화면을 벗어나면 사라집니다). 결과 화면 아래 [내 기록에 저장]을 직접 눌렀을 때만 본인 계정에 저장됩니다. 저장하더라도 AI 심층 분석·종합 프로필·변화 그래프·결과 이미지 저장에서는 빠집니다.",
  },
  {
    q: "과거에 진행했던 이전 검사 결과와 비교해 볼 수 있나요?",
    a: "네. 같은 검사를 2회 이상 하면 결과 화면에 「지난 결과와 비교」 칸이 생겨 직전 결과 대비 달라진 점을 알려 줍니다. 또 [종합 프로필] 화면 아래 「시기별 변화 추이」에서 2회 이상 한 점수형 검사의 변화를 꺾은선 그래프(최근 12회까지)로 볼 수 있습니다.",
  },
  {
    q: "결과 리포트를 인쇄하거나 PDF로 저장할 수 있나요?",
    a: "결과 화면 맨 아래 [인쇄·PDF 저장] 버튼을 누르면 메뉴와 버튼이 숨겨진 인쇄용 화면이 열립니다(인쇄 창에서 「PDF로 저장」 선택). [결과 이미지 저장]을 누르면 결과 카드가 PNG 그림 파일로 내려받아집니다. 그림은 브라우저 안에서 만들어지며 서버로 보내지 않습니다.",
  },
  {
    q: "내 결과는 얼마나 보관되나요?",
    a: "검사 결과는 회원님 계정에 최근 100개까지 보관됩니다. 100개를 넘으면 가장 오래된 결과부터 자동으로 지워집니다. [내 결과]에서 결과를 열어 [결과 삭제]로 직접 지울 수도 있고, 지운 결과는 되돌릴 수 없습니다. 오래 간직할 결과는 [인쇄·PDF 저장]이나 [결과 이미지 저장]으로 내려받아 두세요.",
  },
  {
    q: "결과 화면의 「이어서 보기」는 무엇인가요?",
    a: "결과를 바탕으로 다른 AIMaster 프로그램을 새 창으로 여는 버튼입니다. 16유형 검사 결과에서는 [성격코드에서 유형 해설 보기]·[캐릭코드에서 나와 닮은 캐릭터 보기]·[타로점에서 3장 뽑기]가, 그 밖의 검사에서는 [타로점에서 3장 뽑기]가 보입니다. 유형 코드·지표 비율·질문 문장만 넘어가고 민감한 점수는 보내지 않습니다. 넘어간 프로그램에서 그림 생성이나 카드 해석은 직접 버튼을 눌러야 시작되므로, 이동만으로 요금이 나가지 않습니다.",
  },
  {
    q: "네 가지 기준 막대의 「균형 구간」은 무슨 뜻인가요?",
    a: "16유형 검사 결과에서 어느 한쪽 비율이 40~60% 사이면 금색 띠로 「균형 구간」이라고 표시합니다. 한쪽으로 뚜렷하게 기울지 않고 양쪽 성향을 상황에 따라 함께 쓴다는 뜻이므로, 두 성향의 설명을 함께 읽어 보시면 좋습니다.",
  },
  {
    q: "PC와 휴대폰에서 같이 쓸 수 있나요?",
    a: "네. 같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기(예: 다른 PC)에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="ps-page">
      {/* 1. 가이드북 히어로 */}
      <section className="ps-hero">
        <span className="ps-chip">📖 공식 연동 &amp; 사용 가이드북</span>
        <h1>AI 종합 성격 진단 <em>완벽 활용 매뉴얼</em></h1>
        <p>
          검사와 기본 해석은 API 키 없이 바로 할 수 있습니다. 회원님 Gemini 키를 등록하면
          AI 심층 분석과 2종 이상 검사를 묶은 종합 프로필까지 받을 수 있습니다.
        </p>
        <div className="ps-hero-actions">
          <Link href="/dashboard" className="ps-btn ps-btn-primary">🧭 검사하기로 이동</Link>
          <Link href="/settings" className="ps-btn ps-btn-ghost">🔑 Gemini 키 설정</Link>
        </div>
      </section>

      {/* 2. 4단계 진단 & 융합 워크플로우 */}
      <section className="ps-panel">
        <div className="ps-panel-head">
          <span className="ps-emoji">🗺️</span>
          <div>
            <h2>4단계 진단 &amp; 융합 워크플로우</h2>
            <p>상황별 세부 진단부터 전체 지표를 꿰뚫는 AI 종합 프로필까지의 흐름</p>
          </div>
        </div>
        <div className="ps-steps">
          <div className="ps-step">
            <span className="ps-step-no">STEP 01</span>
            <h3>검사 선택</h3>
            <p>상황별 16유형, 대인관계 소통, 마음 점검 중 원하는 검사를 선택합니다.</p>
            <span className="ps-step-foot">📋 총 {ALL_TESTS.length}종 스위트</span>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 02</span>
            <h3>5단계 직관 응답</h3>
            <p>키보드 숫자키(1~5) 또는 터치로 직관적인 응답을 빠르게 진행합니다.</p>
            <span className="ps-step-foot">⚡ 약 2~5분 소요</span>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 03</span>
            <h3>즉시 결과 &amp; 해석</h3>
            <p>강점, 주의점, 활용 팁이 바로 나오고 [내 결과]에 저장됩니다(마음 상태 점검은 직접 저장을 눌렀을 때만).</p>
            <span className="ps-step-foot">📊 지난 결과와 비교</span>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 04</span>
            <h3>AI 융합 프로필</h3>
            <p>결과 화면의 [AI 심층 분석 받기], 2종 이상 검사 뒤 [종합 프로필 만들기]를 누르면 본인 Gemini 키로 분석합니다(누를 때마다 1회 호출).</p>
            <span className="ps-step-foot">🔮 입체 상관관계 리포트</span>
          </div>
        </div>
      </section>

      {/* 3. 지원 검사군 매트릭스 표 */}
      <section className="ps-panel">
        <div className="ps-between" style={{ marginBottom: 14 }}>
          <div className="ps-panel-head" style={{ marginBottom: 0 }}>
            <span className="ps-emoji">📑</span>
            <div>
              <h2>지원 검사군 매트릭스 도감</h2>
              <p>각 검사군별 측정 목적, 문항 수 및 AI 심층 분석 지원 현황</p>
            </div>
          </div>
          <span className="ps-count">총 {ALL_TESTS.length}개 검사</span>
        </div>
        <div className="ps-table-wrap">
          <table className="ps-table">
            <thead>
              <tr>
                <th>카테고리</th>
                <th>검사명</th>
                <th className="center">문항수</th>
                <th>측정 목적 및 특징</th>
                <th className="center">AI 분석</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => {
                const tests = testsOf(group.id);
                return tests.map((t, idx) => (
                  <tr key={t.id}>
                    {idx === 0 && (
                      <td rowSpan={tests.length} className="ps-cat">{group.label}</td>
                    )}
                    <td className="ps-name">{t.title}</td>
                    <td className="center">{t.questions.length}문항</td>
                    <td>{t.tagline}</td>
                    <td className="center">{isSensitive(t.id) ? "제외" : <span className="ps-tag">지원</span>}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 정확한 자기 이해 7대 황금 수칙 */}
      <section className="ps-panel">
        <div className="ps-panel-head">
          <span className="ps-emoji">🏆</span>
          <div>
            <h2>정확한 자기 이해와 진단 신뢰도 극대화 7대 황금 수칙</h2>
            <p>가장 왜곡 없는 솔직한 나를 발견하기 위한 핵심 가이드</p>
          </div>
        </div>
        <div className="ps-rules">
          {GOLDEN_RULES.map((rule) => (
            <div key={rule.step} className="ps-rule">
              <span className="ps-rule-no">{rule.step}</span>
              <div>
                <h3>{rule.title}</h3>
                <p>{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Gemini API 키 연동 안내 */}
      <section className="ps-panel">
        <div className="ps-panel-head">
          <span className="ps-emoji">🔑</span>
          <h2>Gemini API 키 등록 안내 (AI 심층 분석 &amp; 종합 프로필용)</h2>
        </div>
        <p className="ps-text">
          AI 심층 분석과 종합 프로필은 <strong>회원님 본인의 Google Gemini API 키</strong>로 동작합니다.
          운영자나 다른 회원의 키로 대신 처리되지 않으며, 한 번 등록해 두면 본인 계정에 연결해 보관됩니다.
          좌측 메뉴 [🔑 API키등록·플랫폼연동]에서 키를 붙여 넣고 [키 등록] → [연결 확인] 순서로 누르면 준비가 끝납니다.
        </p>
        <div className="ps-hero-actions" style={{ marginTop: 16 }}>
          <Link href="/settings" className="ps-btn ps-btn-primary">🔑 API키등록·플랫폼연동으로 이동</Link>
          {GEMINI_GUIDE_URL && (
            <GuideLinkButton url={GEMINI_GUIDE_URL} label="📖 Gemini 키 발급 상세 매뉴얼 (새 창)" />
          )}
        </div>
      </section>

      {/* 6. 자주 묻는 질문 — 펼침 화살표는 질문 오른쪽 끝 동그란 버튼 하나 */}
      <section className="ps-panel">
        <div className="ps-panel-head">
          <span className="ps-emoji">❓</span>
          <div>
            <h2>자주 묻는 질문 (FAQ)</h2>
            <p>회원님들이 가장 자주 문의하시는 질문과 답변입니다. 질문을 누르면 답변이 펼쳐집니다.</p>
          </div>
        </div>
        <div className="ps-faq">
          {FAQ_ITEMS.map((item, idx) => (
            <details key={idx}>
              <summary>
                <span><b>Q.</b>{item.q}</span>
                <i aria-hidden="true">▼</i>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
