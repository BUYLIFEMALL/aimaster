import { Hero } from "@/components/ui/Hero";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GUIDES } from "@/lib/guides";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 1. 5단계 원스톱 파이프라인
const PIPELINE_STEPS = [
  {
    step: "STEP 01",
    emoji: "💡",
    title: "주제·후킹 대본",
    desc: "14대 트렌드 분야 선택 후 알고리즘 8대 추천 주제 & 후킹 대본 30초 완성",
    badge: "AI 대본 생성"
  },
  {
    step: "STEP 02",
    emoji: "🎨",
    title: "9:16 비주얼 배경",
    desc: "Pexels/Pixabay 무료 고화질 스톡 영상·사진 & 5초 AI 비디오(Omni Flash)",
    badge: "스톡 & AI 영상"
  },
  {
    step: "STEP 03",
    emoji: "🎬",
    title: "씬 타임라인 & 세이프존",
    desc: "8종 트렌디 테마, 6종 카드 레이아웃, 세이프존 가이드로 자막 가림 방지",
    badge: "9:16 모바일 최적화"
  },
  {
    step: "STEP 04",
    emoji: "🎙️",
    title: "음성·자막·MP4 렌더",
    desc: "Supertone 무료 음성 or ElevenLabs 내 목소리 + BGM 35% 덕킹 브라우저 렌더러",
    badge: "서버비용 0원"
  },
  {
    step: "STEP 05",
    emoji: "📤",
    title: "유튜브 자동 발행",
    desc: "제목 5종 A/B 전략 & 500자 태그 자동완성, 원클릭 즉시·예약 발행 스케줄링",
    badge: "원클릭 업로드"
  }
];

// 2. 유튜브 쇼츠 알고리즘 후킹 6대 공식
const HOOK_FORMULAS = [
  {
    badge: "숫자 구체화형",
    sample: "“이번 달 연봉 앞자리가 바뀌는 AI 실무 도구 5가지!”",
    reason: "구체적 숫자(5가지)와 명확한 보상(연봉 2배)이 첫 3초 시선 이탈을 즉각 방지합니다."
  },
  {
    badge: "질문 & 문제제기형",
    sample: "“아직도 퇴근 30분 전까지 엑셀 일일이 수작업 하세요?”",
    reason: "타깃 시청자의 가장 고통스러운 페인 포인트를 직접 찔러 몰입도를 극대화합니다."
  },
  {
    badge: "반전 & 호기심형",
    sample: "“물 마시는 방법 딱 하나 바꿨더니 한 달 만에 5kg 빠진 이유”",
    reason: "누구나 하는 일상 행위에 예상치 못한 결과를 제시하여 '어떻게?'라는 궁금증을 유발합니다."
  },
  {
    badge: "손실 회피형",
    sample: "“이거 모르면 매달 내 통장에서 30만 원씩 조용히 빠져나갑니다”",
    reason: "인간의 손실 회피 본능을 자극하여 영상을 끝까지 시청하도록 유도합니다."
  },
  {
    badge: "상위 1% 권위형",
    sample: "“상위 1% 일잘러 기획자들만 몰래 쓰는 비밀 사이트 3곳”",
    reason: "검증된 전문가의 노하우를 훔쳐보고 싶다는 욕구를 강력하게 자극합니다."
  },
  {
    badge: "공감 & 스토리형",
    sample: "“월요일 아침 출근길마다 사표 던지고 싶던 제가 찾은 탈출구”",
    reason: "감정적 유대감과 스토리텔링을 통해 평균 시청 지속률을 80% 이상으로 끌어올립니다."
  }
];

// 3. AI 키 등록 3단계
const KEY_STEPS = [
  {
    step: "01",
    emoji: "🌐",
    title: "공식 개발자 콘솔 접속",
    desc: "Google AI Studio, OpenAI, Anthropic 콘솔에 본인 계정으로 안전하게 로그인합니다."
  },
  {
    step: "02",
    emoji: "📋",
    title: "API 키 생성 및 복사",
    desc: "콘솔에서 새 API Key를 발급받아 복사합니다. (절대 타인에게 공유하지 마세요)"
  },
  {
    step: "03",
    emoji: "✅",
    title: "키 등록 & 0원 연결 테스트",
    desc: "🔑 API키등록 메뉴에 붙여넣고 [연결 확인]을 누릅니다. 요금 없이 연결 상태만 확인됩니다."
  }
];

// 4. 자주 묻는 질문
const FAQ_LIST = [
  {
    q: "「키가 없습니다」라는 알림이 나와요.",
    a: "현재 선택된 AI 공급사(Gemini, OpenAI, Claude)의 본인 키가 등록되지 않았기 때문입니다. 상단 사이드바의 [🔑 API키등록·플랫폼연동] 메뉴에서 키를 입력하거나, 대시보드에서 키가 등록된 다른 AI 모델을 선택하시면 즉시 사용하실 수 있습니다."
  },
  {
    q: "유튜브 영상 제작 및 MP4 렌더링에 서버 비용이 드나요?",
    a: "아닙니다! shorts-onestop-studio는 WebCodecs 및 브라우저 자체 렌더링 엔진을 사용하므로 서버 렌더링 비용이 0원입니다. 사용자 PC 브라우저 안에서 1080×1920 Full HD 영상을 고속으로 생성합니다."
  },
  {
    q: "유튜브 채널 연동은 어떻게 하나요?",
    a: "다른 유튜브 프로그램(「유튜브 댓글 자동화」 또는 「YOUTUBE Shots 자동화」)에서 본인 Google OAuth 앱으로 채널을 1회만 연결해두시면, 이 프로그램에서도 추가 설정 없이 내 채널로 즉시 영상을 업로드하고 예약할 수 있습니다."
  },
  {
    q: "유튜브에 하루 몇 편까지 올릴 수 있나요?",
    a: "유튜브 Data API의 무료 일일 할당량(10,000단위) 기준, 1회 영상 업로드는 약 1,600단위가 소모되어 하루 약 6편까지 안전하게 자동 업로드할 수 있습니다."
  },
  {
    q: "AI 생성 영상이나 음성이 30일 뒤 삭제된다고 나오는데 왜 그런가요?",
    a: "회원 데이터 보호 및 불필요한 스토리지 요금 방지를 위한 보안 정책입니다. 제작된 대본 텍스트는 영구 보존되며, 30일이 지난 미디어는 [음성 없는 장면 모두 만들기]나 배경 재생성 버튼으로 언제든 1초 만에 다시 렌더링할 수 있습니다."
  },
  {
    q: "AI 영상 장면(동영상)은 어떤 키가 필요한가요?",
    a: "기본 Gemini Omni Flash 영상 생성은 Google Cloud 결제가 연결된 유료 등급 키가 필요합니다. Replicate 또는 fal 키를 등록하시면 Seedance 1 Lite, Kling 등 가성비 높은 전문 비디오 모델을 선택하여 장면당 약 $0.03부터 제작하실 수 있습니다."
  }
];

export default function GuidePage() {
  return (
    <>
      <Hero
        eyebrow="YOUTUBE SHORTS CREATOR PLAYBOOK"
        title="📖 유튜브 쇼츠 원스톱 제작 매뉴얼 & 알고리즘 공략집"
        desc="주제 선정부터 AI 대본, 9:16 비주얼 배경, 1080p MP4 렌더링, 유튜브 원클릭 자동 업로드까지 초보자도 1분 만에 마스터하는 단계별 비주얼 가이드북입니다."
        emoji="🧭"
        meta={["⚡ 1분 완성 파이프라인", "🎯 평균 지속률 80% 달성 공식", "🎬 서버 비용 0원 MP4 렌더러", "🔑 본인 AI 키 100% 보안"]}
      />

      <div className="stack" style={{ gap: 24 }}>
        {/* SECTION 1: 5단계 초고속 제작 파이프라인 (At a Glance) */}
        <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>🗺️ 한눈에 보는 5단계 원스톱 제작 파이프라인</h2>
            <span className="badge brand" style={{ fontWeight: 800 }}>전체 워크플로우</span>
          </div>
          <div className="guide-pipeline-grid">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.step} className="guide-pipeline-card">
                <div>
                  <span className="guide-pipeline-step-badge">{step.step}</span>
                  <div style={{ fontSize: 28, margin: "6px 0" }}>{step.emoji}</div>
                  <strong style={{ fontSize: 14, color: "var(--fg)", display: "block", marginBottom: 4 }}>
                    {step.title}
                  </strong>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                </div>
                <div style={{ marginTop: 12 }}>
                  <span className="badge brand" style={{ fontSize: 10 }}>{step.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: 4단계 핵심 제작 실전 마스터클래스 */}
        <section className="stack" style={{ gap: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>🚀 단계별 실전 제작 가이드 & 디테일 노하우</h2>
            <span className="badge" style={{ fontWeight: 700 }}>Step-by-Step Guide</span>
          </div>

          {/* STEP 1. 주제·후킹 대본 */}
          <div className="guide-master-card">
            <div className="guide-step-header">
              <div className="guide-step-title">
                <span className="guide-step-num">01</span>
                <span>💡 STEP 1 · 분야 선택 & 3초 후킹 대본 기획</span>
              </div>
              <span className="badge brand">대본 생성 엔진</span>
            </div>
            <div className="avatar-tip">
              <span className="avatar">💡</span>
              <div>
                <strong>황금 꿀팁! 주제 문구에 숫자를 넣어보세요</strong>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>
                  「2026 직장인 연봉 2배 AI 도구 5가지」처럼 숫자가 포함되면, AI가 <strong>[인트로 후킹 ➔ 5장 핵심 카드 ➔ 아웃트로 콜투액션]</strong> 구조로 대본과 카드 분할을 완벽히 자동 세팅합니다.
                </p>
              </div>
            </div>
            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <strong><span>📌</span> 14개 트렌드 카테고리</strong>
                <p>건강·운동, 직장·자기계발, 재테크, AI·IT, 꿀팁·지식 등 검증된 14대 쇼츠 카테고리 칩셋을 클릭 한 번으로 선택합니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🎯</span> 8대 알고리즘 추천 주제</strong>
                <p>유튜브 실시간 검색 및 트렌드 패턴을 분석하여 클릭률이 가장 높은 8개의 후킹 주제를 즉시 제안받거나 직접 입력합니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>⏱️</span> 맞춤 러닝타임 (30초·45초·60초)</strong>
                <p>목표 시간과 카드 수(3~8장), 말투(전문적/친근한/위트)를 선택하면 인트로·본문·해시태그가 일체형으로 생성됩니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🎬</span> 레퍼런스 쇼츠 대본 추출</strong>
                <p>유튜브에서 인기 있는 쇼츠 영상을 참고 자료로 등록하면, 본인 OpenAI 키로 음성을 받아써 핵심 후킹 구성만 벤치마킹합니다.</p>
              </div>
            </div>
          </div>

          {/* STEP 2. 디자인·배경 비주얼 */}
          <div className="guide-master-card">
            <div className="guide-step-header">
              <div className="guide-step-title">
                <span className="guide-step-num">02</span>
                <span>🎨 STEP 2 · 9:16 비주얼 배경 & 움직이는 AI 비디오</span>
              </div>
              <span className="badge brand">스톡 비디오 & 생성 AI</span>
            </div>
            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <strong><span>🎞️</span> 3가지 배경 모드 지원</strong>
                <p><strong>[테마 전용]</strong> 깔끔한 그래픽 배경, <strong>[전체 1장]</strong> 영상 전체를 아우르는 배경, <strong>[장면마다 개별]</strong> 씬별 맞춤 배경을 자유롭게 선택합니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🔍</span> Pexels · Pixabay 고화질 스톡 검색</strong>
                <p>[AI로 장면 설명 만들기]를 누르면 대본을 분석해 씬마다 최적의 스톡 비디오 검색어와 AI 프롬프트를 자동으로 채워줍니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🎬</span> 움직이는 5초 AI 비디오 장면</strong>
                <p>정지된 사진 배경에서 [AI 영상]을 누르면 사진이 생동감 있게 살아 움직이는 5초 비디오 클립으로 렌더링됩니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🔄</span> 장면 간 자연스러운 이어붙이기</strong>
                <p>「다음 장면과 이어지게」를 켜면 이전 장면의 끝 화면과 다음 장면의 첫 화면을 부드럽게 모핑하여 몰입도를 극대화합니다.</p>
              </div>
            </div>
          </div>

          {/* STEP 3. 씬 편집 & 세이프존 */}
          <div className="guide-master-card">
            <div className="guide-step-header">
              <div className="guide-step-title">
                <span className="guide-step-num">03</span>
                <span>🎬 STEP 3 · 씬 타임라인 & 유튜브 자막 세이프존</span>
              </div>
              <span className="badge brand">UI 커스터마이징</span>
            </div>
            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <strong><span>📐</span> 1080×1920 세로형 실시간 캔버스</strong>
                <p>실제 유튜브 쇼츠 스마트폰 화면 크기에서 글꼴, 카드 색상, 타이틀 모션 애니메이션이 실시간으로 렌더링됩니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🎨</span> 8대 트렌드 테마 & 6종 카드 레이아웃</strong>
                <p>유튜브 크리에이터 스튜디오, 다크 헐리우드, 네온 사이버, 페이퍼 에디토리얼 등 다양한 분위기의 템플릿을 지원합니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🔲</span> 자막 가림 방지 세이프존 (Safe Area)</strong>
                <p>[세이프에어리어] 스위치를 켜면 유튜브 우측 버튼(좋아요·댓글) 및 하단 채널명 가림 영역을 빨간선으로 안전하게 확인합니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>✍️</span> 나만의 맞춤 지침 (AI 비용 0원 모드)</strong>
                <p>이미 준비된 대본이 있다면 복사해 넣기만 해도 [한 줄 = 한 장면]으로 즉시 분할 변환되어 AI 호출 요금 없이 제작할 수 있습니다.</p>
              </div>
            </div>
          </div>

          {/* STEP 4. 음성·자막 & 브라우저 MP4 렌더링 */}
          <div className="guide-master-card">
            <div className="guide-step-header">
              <div className="guide-step-title">
                <span className="guide-step-num">04</span>
                <span>🎙️ STEP 4 · AI 내레이션, 스마트 자막 & 초고속 MP4 완성</span>
              </div>
              <span className="badge brand">BGM 덕킹 & 브라우저 렌더러</span>
            </div>
            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <strong><span>🔊</span> 완전 무료 브라우저 음성 (Supertone)</strong>
                <p>외부 API 호출 및 요금 없이 내 브라우저에서 직접 남녀 10종의 고품질 음성을 생성합니다. (상업적 이용 100% 가능)</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🎙️</span> ElevenLabs 내 목소리 복제</strong>
                <p>본인의 30초 음성 파일을 업로드하여 나만의 목소리로 쇼츠 전체를 내레이션할 수 있습니다. (Starter 이상 요금제)</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>💬</span> 말하는 순간 맞춤형 싱크 자막</strong>
                <p>음성이 나오는 정확한 낱말 시각에 맞춰 자막이 하이라이트되며, 숫자나 영문 표기가 왜곡되지 않고 대본 그대로 유지됩니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🎵</span> BGM 스마트 35% 덕킹 & MP4 렌더</strong>
                <p>목소리가 나올 때 배경음악이 35%로 자동 감소하며, 서버 전송 비용 없이 브라우저에서 1080p MP4를 고속 렌더링합니다.</p>
              </div>
            </div>
          </div>

          {/* STEP 5. 유튜브 자동 발행 & 30일 플래닝 */}
          <div className="guide-master-card">
            <div className="guide-step-header">
              <div className="guide-step-title">
                <span className="guide-step-num">05</span>
                <span>📤 STEP 5 · 유튜브 원클릭 채널 업로드 & 30일 발행 플래너</span>
              </div>
              <span className="badge brand">원클릭 스케줄러</span>
            </div>
            <div className="guide-feature-grid">
              <div className="guide-feature-box">
                <strong><span>🏷️</span> A/B 제목 후보 5종 & 500자 태그</strong>
                <p>클릭률을 극대화하는 5가지 제목 후보, 최적화된 영상 설명란, 해시태그, 스튜디오 500자 태그가 자동 생성됩니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>🚀</span> 브라우저 ➔ 유튜브 다이렉트 업로드</strong>
                <p>중간 서버를 거치지 않고 내 브라우저에서 유튜브 공식 API로 직접 영상을 쏘아 올려 빠르고 안전합니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>📅</span> 30일치 발행 계획 자동 스케줄링</strong>
                <p>채널 단계와 분야를 선택하면 매일 최적의 알고리즘 업로드 시간대에 맞춰 30일 치 대본과 영상이 자동 배치됩니다.</p>
              </div>
              <div className="guide-feature-box">
                <strong><span>⚡</span> N편 원클릭 일괄 제작 (Batch Mode)</strong>
                <p>발행 계획에 등록된 수십 편의 대본을 [대본 + 배경 + 음성 + MP4 + 유튜브 예약]까지 원클릭으로 한 번에 자동 완성합니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: 유튜브 쇼츠 알고리즘 후킹 6대 공식 치트시트 */}
        <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>🔥 유튜브 쇼츠 떡상 알고리즘 후킹 6대 공식 치트시트</h2>
            <span className="badge brand" style={{ fontWeight: 800 }}>평균 지속률 80% 달성</span>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            유튜브 쇼츠 피드에서 시청자가 3초 안에 위로 넘기지 않고 끝까지 머물게 만드는 상위 1% 크리에이터들의 검증된 첫 문장 공식입니다.
          </p>
          <div className="guide-hook-grid">
            {HOOK_FORMULAS.map((item, idx) => (
              <div key={idx} className="guide-hook-card">
                <span className="guide-hook-badge">공식 {idx + 1} · {item.badge}</span>
                <div className="guide-hook-sample">{item.sample}</div>
                <div className="guide-hook-reason">💡 {item.reason}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: 1분 완성 AI 키 등록 3단계 */}
        <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>🔑 본인 AI 키 등록 — 3단계 초간단 가이드</h2>
            <span className="badge brand" style={{ fontWeight: 800 }}>회원 본인 키 100% 격리</span>
          </div>
          <div className="diagram" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {KEY_STEPS.map((k) => (
              <div key={k.step} className="node" style={{ textAlign: "left", padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{k.emoji}</span>
                  <span className="badge" style={{ fontWeight: 800 }}>STEP {k.step}</span>
                </div>
                <strong style={{ fontSize: 14, color: "var(--fg)", display: "block", marginBottom: 6 }}>
                  {k.title}
                </strong>
                <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.55 }}>
                  {k.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 10, flexWrap: "wrap", gap: 10 }}>
            <GuideLinkButton url={GUIDES.gemini} label="Google Gemini 키 발급 가이드" />
            <GuideLinkButton url={GUIDES.openai} label="OpenAI 키 발급 가이드" />
            <GuideLinkButton url={GUIDES.anthropic} label="Claude 키 발급 가이드" />
            <GuideLinkButton url={GUIDES.pexels} label="Pexels 무료 스톡 키 발급" />
            <GuideLinkButton url={GUIDES.pixabay} label="Pixabay 무료 스톡 키 발급" />
            <a className="button primary btn-3d-yt-red" href="/settings" style={{ marginLeft: "auto" }}>
              🔑 지금 키 등록하러 가기 →
            </a>
          </div>
        </section>

        {/* SECTION 5: 안심 운영 원칙 & Do's and Don'ts */}
        <div className="guide-dos-donts-grid">
          <div className="guide-do-box">
            <strong style={{ fontSize: 14, color: "var(--ok)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>✅</span> 실전 성공 팁 (Do's)
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
              <li><strong>첫 3초 후킹 강조</strong>: 화면 중앙의 옐로우 자막 칩셋에 핵심 질문이나 숫자를 꼭 남겨두세요.</li>
              <li><strong>스마트폰 세이프존 확인</strong>: [세이프에어리어] 빨간선 안쪽에 자막이 들어가도록 위치를 잡으세요.</li>
              <li><strong>무료 음성 적극 활용</strong>: 내 브라우저 내장 Supertone 음성을 활용하면 음성 생성 요금이 0원입니다.</li>
            </ul>
          </div>
          <div className="guide-dont-box">
            <strong style={{ fontSize: 14, color: "var(--err)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️</span> 주의사항 (Don'ts)
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
              <li><strong>유튜브 일일 업로드 초과 금지</strong>: 유튜브 무료 API 한도상 하루 약 6편까지가 권장 업로드 수량입니다.</li>
              <li><strong>타인 키 사용 금지</strong>: 본인 API 키만 사용하며, 공유 키나 대리 호출은 시스템상 자동 차단됩니다.</li>
              <li><strong>렌더링 도중 탭 닫기 주의</strong>: 브라우저 자체 MP4 인코딩 중에는 브라우저 탭을 닫지 말고 유지해주세요.</li>
            </ul>
          </div>
        </div>

        {/* SECTION 6: 자주 묻는 질문 (FAQ) */}
        <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>❓ 자주 묻는 질문 (FAQ)</h2>
            <span className="badge" style={{ fontWeight: 700 }}>고객 지원 & 트러블슈팅</span>
          </div>
          <div className="guide-faq-grid">
            {FAQ_LIST.map((faq, idx) => (
              <div key={idx} className="guide-faq-item">
                <strong><span>💬</span> Q. {faq.q}</strong>
                <p>A. {faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
