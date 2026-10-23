import Link from "next/link";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ALL_TESTS, GROUPS, testsOf } from "@/lib/tests/registry";

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
    a: "종합 프로필은 완료한 각 검사의 지표(외향/내향, 사고/감정, 스트레스 지수 등)를 가중치 기반으로 종합하여 단일한 레이더 차트와 다차원 성향 요약 매트릭스를 생성합니다. 또한 회원 본인의 Gemini AI 키를 연동하면 검사 간 상호작용과 잠재적 시너지를 다각도로 입체 분석한 AI 리포트를 제공합니다.",
  },
  {
    q: "AI 심층 분석과 종합 프로필에는 왜 별도의 API 키가 필요한가요?",
    a: "AIMaster의 최상위 불변 원칙에 따라, AI 연동 서비스는 운영자나 타인의 키로 대리 처리되지 않으며 회원 본인 소유의 Google Gemini API 키(무료 티어 지원)로만 안전하게 구동됩니다. 일반 검사 및 기본 해석은 API 키 없이도 100% 무료로 즉시 이용 가능합니다.",
  },
  {
    q: "마음 상태(스트레스·우울감 등) 점검 결과는 왜 자동 저장되지 않나요?",
    a: "심리 및 마음 건강 데이터는 개인의 가장 민감한 프라이버시 정보이므로, 검사 즉시 화면에만 표시되고 서버 DB에는 기본적으로 자동 저장되지 않습니다. 회원이 직접 [내 기록에 저장]을 눌렀을 때만 본인 계정에 암호화 보관되며, AI 분석 데이터로 외부 전송되지 않습니다.",
  },
  {
    q: "과거에 진행했던 이전 검사 결과와 비교해 볼 수 있나요?",
    a: "네, 동일한 검사를 2회 이상 완료하시면 결과 화면 상단에 '지난 결과와 비교' 배너가 자동으로 활성화됩니다. 이전 수치 대비 각 지표가 어떻게 변화했는지 한눈에 비교할 수 있어 자기 성찰에 큰 도움이 됩니다.",
  },
  {
    q: "결과 리포트를 인쇄하거나 PDF로 저장할 수 있나요?",
    a: "결과 화면에서 브라우저 인쇄 단축키(Ctrl+P 또는 Cmd+P)를 누르시면, 불필요한 사이드바와 버튼이 자동으로 숨겨지고 깔끔한 A4 용지 규격의 '성격 진단 공식 리포트' 형태로 즉시 인쇄 및 PDF 저장이 가능하도록 전용 프린트 스타일시트가 적용되어 있습니다.",
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
          검사는 키 없이 즉시 무료로 참여할 수 있으며, 2종 이상의 검사 융합 분석과
          AI 심층 입체 프로필 생성을 위한 모든 안내와 황금 수칙을 확인하세요.
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
            <p>강점, 주의점, 활용 팁이 즉시 도출되며 [내 결과]에 안전하게 보관됩니다.</p>
            <span className="ps-step-foot">📊 지난 결과와 비교</span>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 04</span>
            <h3>AI 융합 프로필</h3>
            <p>2종 이상 검사를 완료하면 다중 검사를 결합한 AI 심층 입체 프로필을 받습니다.</p>
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
                    <td className="center"><span className="ps-tag">지원</span></td>
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
          운영자나 다른 회원의 키로 대신 처리되지 않으며, 한 번 등록해 두면 안전하게 암호화 보관되어 모든 분석 기능을 자유롭게 이용할 수 있습니다.
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
