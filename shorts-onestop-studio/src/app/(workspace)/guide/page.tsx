import { Hero } from "@/components/ui/Hero";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GUIDES } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼 — 표준 §5.6(다이어그램·캐릭터·이모티콘·인포그래픽·팁 박스)
const FLOW = [
  { emoji: "💡", title: "주제·대본", desc: "분야 → 주제 추천 → AI 대본", state: "사용 가능" },
  { emoji: "🎨", title: "배경", desc: "스톡 영상·사진 · AI 이미지 · AI 영상", state: "사용 가능" },
  { emoji: "🎬", title: "장면 편집", desc: "테마 · 카드 레이아웃 · 글꼴 · 미리보기 재생", state: "사용 가능" },
  { emoji: "🎙️", title: "음성·자막·MP4", desc: "본인 키 내레이션 · 자막 · 배경음악 · 브라우저 MP4 · 업로드 문구 · 유튜브 바로 올리기", state: "사용 가능" },
  { emoji: "📅", title: "발행 계획", desc: "채널 단계 전략 · 날짜별 일정 · 대본~MP4 일괄 제작", state: "사용 가능" },
];
const KEY_STEPS = [
  { emoji: "🌐", title: "콘솔 접속", desc: "Google AI Studio · OpenAI · Anthropic 콘솔에 본인 계정으로 로그인" },
  { emoji: "📋", title: "키 복사", desc: "API 키 만들기 → 키를 복사(다른 사람에게 보내지 않기)" },
  { emoji: "✅", title: "등록·확인", desc: "🔑 API키등록·플랫폼연동에 붙여넣고 [연결 확인] (요금 없음)" },
];

export default function GuidePage() {
  return (
    <>
      <Hero eyebrow="GUIDE" title="📖 3분 만에 첫 쇼츠 대본 만들기" desc="처음 오셨나요? 아래 순서대로 따라 하면 본인 AI 키 등록부터 첫 대본 저장까지 끝낼 수 있어요." emoji="🧭" meta={["🔑 키 1개면 시작", "💸 가장 저렴한 모델이 기본값", "🗂️ 대본은 보관함에 저장"]} />
      <div className="stack">
        <section className="card stack">
          <h2>🗺️ 전체 흐름</h2>
          <div className="diagram five">{FLOW.map((f) => (
            <div key={f.title} className="node"><div className="emoji">{f.emoji}</div><strong>{f.title}</strong><p className="muted" style={{ fontSize: 12 }}>{f.desc}</p><span className={`badge ${f.state === "사용 가능" ? "brand" : ""}`}>{f.state}</span></div>
          ))}</div>
        </section>
        <section className="card stack">
          <h2>🔑 본인 AI 키 등록 — 3단계</h2>
          <div className="diagram" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>{KEY_STEPS.map((k, i) => (
            <div key={k.title} className="node"><div className="emoji">{k.emoji}</div><strong>{i + 1}. {k.title}</strong><p className="muted" style={{ fontSize: 12 }}>{k.desc}</p></div>
          ))}</div>
          <div className="actions"><GuideLinkButton url={GUIDES.gemini} label="Gemini 키 발급 매뉴얼" /><GuideLinkButton url={GUIDES.openai} label="OpenAI 키 발급 매뉴얼" /><GuideLinkButton url={GUIDES.anthropic} label="Claude 키 발급 매뉴얼" /><GuideLinkButton url={GUIDES.pexels} label="Pexels 키 발급 매뉴얼" /><GuideLinkButton url={GUIDES.pixabay} label="Pixabay 키 발급 매뉴얼" /><a className="button primary" href="/settings">🔑 키 등록하러 가기</a></div>
        </section>
        <section className="card stack">
          <h2>💡 주제·대본 사용법 및 단계별 제작 노하우</h2>
          <div className="avatar-tip">
            <span className="avatar">🤖</span>
            <div>
              <strong>꿀팁! 주제 문구에 숫자를 넣어 보세요</strong>
              <p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
                「아침 습관 5가지」처럼 숫자가 있으면 구성이 TOP N 리스트·카드 5장으로 자동 맞춰집니다. 「~하는 법」은 단계별 방법, 「썰·실화·반전」은 스토리로 바뀌어요. 직접 바꾸면 그 값이 유지됩니다.
              </p>
            </div>
          </div>

          <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📝</span> 기본 4단계 대본 제작 흐름
            </h3>
            <ol className="stack" style={{ gap: 8, margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.65 }}>
              <li><strong>분야 고르기</strong> — 14개 분야 칩 중 하나를 누릅니다. 키워드나 참고 자료(기사·메모, txt·md 파일)를 넣으면 그 내용을 근거로 씁니다.</li>
              <li><strong>주제 8개 추천받기</strong> — 마음에 드는 카드를 누르거나 주제를 직접 입력합니다.</li>
              <li><strong>대본 만들기</strong> — 말투·구성·카드 수(3~8장)와 목표 길이(약 30·45·60초)를 확인하고 누르면 인트로·카드·아웃트로 대본과 해시태그가 나옵니다.</li>
              <li><strong>다듬고 저장</strong> — 화면 제목은 짧게, 자세한 내용은 내레이션에 입력한 뒤 [보관함에 저장]을 누릅니다.</li>
            </ol>
          </div>

          {/* 5대 핵심 제작 파이프라인 가이드 카드 그리드 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            {/* 1. 배경 설정 */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 14, lineHeight: 1.65 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 15, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎨</span> 1. 디자인·배경 설정 가이드
                </strong>
                <span className="badge brand">스톡 무료 검색 & AI 이미지</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
                <li><strong>배경 방식 선택</strong>: [🎨 디자인·배경]에서 3가지 방식(테마만 / 전체 1장 / 장면마다) 중 원하는 형태를 고릅니다.</li>
                <li><strong>AI 자동 묘사</strong>: [AI로 장면 설명 만들기]를 누르면 대본을 분석해 장면마다 스톡 검색어와 AI 이미지 설명 프롬프트를 자동으로 채워줍니다.</li>
                <li><strong>스톡 미디어 & 생성</strong>: [검색]으로 Pexels·Pixabay의 고화질 무료 영상·사진을 고르거나, [AI 이미지] 버튼으로 Gemini 9:16 이미지를 즉시 생성해 [배경 저장]을 누릅니다.</li>
                <li><strong>🎬 AI 영상 장면</strong>: 사진 배경(AI 이미지·스톡 사진)이 있는 장면에서 [AI 영상]을 누르면 그 사진을 첫 화면으로 5초 영상을 만듭니다. 「다음 장면과 이어지게」를 켜면 다음 장면 사진을 끝 화면으로 넣어 장면이 자연스럽게 이어집니다. 1~5분 걸리며, 화면을 닫았다 다시 열어도 이어서 확인합니다. 마음에 안 들면 ↺ 버튼으로 처음 사진으로 되돌립니다.</li>
                <li><strong>영상 모델·단가</strong>: 기본은 Gemini Omni Flash(본인 Gemini 키, 결제 연결 필요, 초당 약 $0.10)이고, Replicate·fal 키를 등록하면 Seedance 1 Lite(초당 약 $0.036)·Kling 등을 고를 수 있습니다. 모델 목록과 버튼에 장면 1개 예상 금액이 표시되며, 요금은 본인 업체 계정에 청구됩니다. 만든 영상은 30일 뒤 자동 삭제됩니다.</li>
                <li style={{ color: "var(--muted)", fontSize: 13 }}>💡 스톡 API 키(Pexels, Pixabay)는 무료로 발급됩니다 (🔑 API키등록·플랫폼연동의 발급 매뉴얼 참고).</li>
              </ul>
            </div>

            {/* 2. 음성·자막·음악 */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 14, lineHeight: 1.65 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 15, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎙️</span> 2. 음성·자막·음악 & 브라우저 MP4 렌더링
                </strong>
                <span className="badge brand">BGM 자동 덕킹 & 원클릭 MP4</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
                <li><strong>AI 내레이션 생성</strong>: [🎙️ 음성·자막·영상]에서 음성 모델·목소리·빠르기를 고르고 [음성 없는 장면 모두 만들기]를 누르면 내레이션이 생성되고 장면 길이가 음성에 맞춰 자동 정렬됩니다.</li>
                <li><strong>자막 & 배경음악 덕킹</strong>: 자막 스타일·위치·크기를 고르고 내 음악 파일을 업로드하면, 목소리가 나올 때 자동으로 배경음악 볼륨이 35%로 줄어드는 스마트 덕킹이 적용됩니다.</li>
                <li><strong>브라우저 자체 MP4 완성</strong>: [MP4 만들기]를 누르면 서버 렌더링 비용 없이 브라우저 내에서 1080×1920 세로 MP4(음성+자막+음악 포함)를 직접 렌더링하여 [MP4 내려받기]로 즉시 저장합니다 (제작 중 탭 유지).</li>
                <li><strong>유튜브 업로드 문구</strong>: [업로드 문구 만들기]를 누르면 최적화된 제목 후보 5개, 영상 설명란, 해시태그, 검색 태그가 생성되어 원클릭으로 복사해 유튜브에 등록할 수 있습니다.</li>
                <li><strong>📤 유튜브에 바로 올리기</strong>: ⑥ 카드에서 제목·설명·태그·공개 범위(비공개·일부 공개·공개)·예약 공개 시각을 정하고 [유튜브에 올리기]를 누르면 방금 만든 MP4가 내 채널에 올라갑니다. 영상은 이 브라우저에서 유튜브로 직접 보내져 서버 요금이 없고, 유튜브 연결은 「유튜브 댓글 자동화」나 「YOUTUBE Shots 자동화」에서 한 번 연결한 계정을 그대로 씁니다(올린 기록은 대본에 저장).</li>
                <li><strong>📅 발행 계획과 이어서 올리기</strong>: 발행 계획에 들어 있는 대본이면 ⑥ 카드가 그 일정 날짜·시각으로 예약 공개를 미리 채웁니다. 발행 계획 ③ 「한꺼번에 만들기」에서 🎬 MP4와 함께 <strong>📤 유튜브 예약</strong>을 켜면, 편마다 MP4를 만든 뒤 일정 시각으로 비공개 예약 업로드까지 이어서 합니다(하루 약 6편 한도, 지난 일정은 예약 없이 비공개로 올림).</li>
              </ul>
            </div>

            {/* 3. 발행 계획 */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 14, lineHeight: 1.65 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 15, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📅</span> 3. 채널 맞춤 발행 계획 & 원클릭 일괄 제작
                </strong>
                <span className="badge brand">최대 30일치 자동 플래닝</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
                <li><strong>AI 채널 운영 전략</strong>: [📅 발행 계획]에서 채널 단계(1~6단계)·분야(1~3개)·하루 편수·기간을 선택하고 [계획 만들기]를 누르면 날짜별 주제와 추천 업로드 시간대가 자동 배치됩니다 (한 번에 최대 30개).</li>
                <li><strong>일정 스마트 보정</strong>: 오늘 이미 지난 시각은 다음 추천 시각으로 자동 이월되며, ✏️(수정), 🗑(삭제), [+ 주제 추가]로 일정을 자유롭게 커스텀할 수 있습니다.</li>
                <li><strong>원클릭 N편 일괄 제작</strong>: 대본(필수), 배경, 음성, MP4 중 원하는 단계를 체크하고 [N편 만들기]를 누르면 전 과정이 전자동 처리되어 보관함에 저장됩니다.</li>
              </ul>
            </div>

            {/* 4. 장면 편집 */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 14, lineHeight: 1.65 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 15, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎬</span> 4. 장면 편집 & 유튜브 세이프에어리어 가이드
                </strong>
                <span className="badge brand">8가지 테마 & 세이프존 확인</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
                <li><strong>실시간 쇼츠 미리보기</strong>: 저장한 대본을 [🎬 장면 편집]에서 선택하면 9:16 실제 쇼츠 화면으로 실시간 렌더링 재생됩니다.</li>
                <li><strong>스타일 커스터마이징</strong>: 테마 8종, 카드 레이아웃 6종, 제목 글꼴 5종, 제목 애니메이션 효과를 원하는 스타일로 조합하고 [디자인 저장]을 누릅니다.</li>
                <li><strong>세이프에어리어(Safe Area) 보호</strong>: [세이프에어리어] 스위치를 켜면 유튜브 우측 버튼(좋아요·댓글)이나 하단 제목에 자막이 가려지는 위험 영역이 빨간선으로 표시되어 배치를 안전하게 조정할 수 있습니다.</li>
              </ul>
            </div>

            {/* 5. 내 지침 & 대본 직접 변환 */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 14, lineHeight: 1.65 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 15, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>✍️</span> 5. 전용 내 지침 설정 & 기존 대본 직접 변환
                </strong>
                <span className="badge brand">AI 요금 0원 모드 지원</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, color: "var(--fg)" }}>
                <li><strong>나만의 지침 우선 적용</strong>: 분야마다 선호하는 말투, 금지어, 구성 규칙을 저장해 두고 「내 지침 사용」을 켜면 AI 기본 프롬프트보다 최우선으로 반영됩니다.</li>
                <li><strong>내 대본으로 만들기</strong>: 이미 작성해 둔 글이나 대본이 있다면 복사해 넣고 [내 대본으로 만들기]를 누르면 「한 줄 = 한 장면」으로 즉시 쇼츠 카드가 분할 생성됩니다 (AI 호출 0회, 비용 0원).</li>
              </ul>
            </div>
          </div>
        </section>
        <div className="grid2">
          <div className="notice"><strong>🛡️ 본인 키 원칙</strong><p>모든 AI 호출은 회원 본인 키로만 합니다. 운영자나 다른 회원의 키로 대신 처리하지 않으며, 요금과 사용 한도는 본인 공급사 계정에 적용됩니다.</p></div>
          <div className="notice warning"><strong>💸 요금 안내</strong><p>기본 모델은 각 공급사에서 가장 가벼운 모델(Gemini Flash-Lite · GPT-4o mini · Claude Haiku)입니다. 대본 1편은 짧은 요청 1~2회입니다. 정확한 요금은 각 공급사 가격표를 확인하세요.</p></div>
        </div>
        <section className="card stack">
          <h2>❓ 자주 묻는 질문</h2>
          <div className="list">
            <div className="list-item"><div><strong>「키가 없습니다」라고 나와요</strong><small>지금 고른 AI의 키가 없을 때입니다. 🔑 API키등록·플랫폼연동에서 키를 저장하거나, 위쪽 「사용할 AI」를 키가 있는 공급사로 바꿔 주세요.</small></div></div>
            <div className="list-item"><div><strong>「사용 한도」 안내가 나와요</strong><small>본인 공급사 계정의 무료 한도·결제 설정 문제입니다. 잠시 뒤 다시 하거나 다른 AI를 골라 주세요.</small></div></div>
            <div className="list-item"><div><strong>「유튜브 채널이 아직 연결되지 않았습니다」라고 나와요</strong><small>이 프로그램은 유튜브 연결 화면이 따로 없습니다. 「유튜브 댓글 자동화」 또는 「YOUTUBE Shots 자동화」에서 본인 Google 앱(Client ID·Secret)으로 채널을 한 번 연결한 뒤 ⑥에서 [다시 확인]을 눌러 주세요. 「영상 올리기 권한이 없습니다」면 Shots에서 「다른 YouTube 프로그램 권한도 함께 받기」를 켜고 다시 연결하면 됩니다.</small></div></div>
            <div className="list-item"><div><strong>유튜브에 하루 몇 편까지 올릴 수 있나요?</strong><small>유튜브 무료 할당량(하루 10,000단위) 기준 업로드 1회가 약 1,600단위라 하루 약 6편입니다. 한도를 넘으면 다음 날 다시 올려 주세요. 처음 올리는 채널은 유튜브가 처리하는 데 몇 분 걸릴 수 있습니다.</small></div></div>
            <div className="list-item"><div><strong>AI 영상이 「결제가 연결된 키에서만 됩니다」라고 나와요</strong><small>Gemini 영상 모델은 무료 등급 키로는 쓸 수 없습니다. Google AI Studio에서 결제(유료 등급)를 연결하거나, Replicate·fal 키를 등록해 다른 영상 모델을 골라 주세요. 실패한 영상은 자동으로 다시 보내지 않습니다(이중 요금 방지).</small></div></div>
            <div className="list-item"><div><strong>스토리가 자연스럽지 않아요</strong><small>구성을 「스토리」로 두고, 설정에서 상위 모델(Gemini 3.8 Flash · Claude Sonnet 5.5 등)을 고르면 흐름이 더 매끄럽습니다.</small></div></div>
          </div>
        </section>
      </div>
    </>
  );
}
