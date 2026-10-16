import { Hero } from "@/components/ui/Hero";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GUIDES } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼 — 표준 §5.6(다이어그램·캐릭터·이모티콘·인포그래픽·팁 박스)
const FLOW = [
  { emoji: "💡", title: "주제·대본", desc: "분야 → 주제 추천 → AI 대본", state: "사용 가능" },
  { emoji: "🎨", title: "배경", desc: "스톡 영상·사진 · AI 이미지", state: "사용 가능" },
  { emoji: "🎬", title: "장면 편집", desc: "테마 · 카드 레이아웃 · 글꼴 · 미리보기 재생", state: "사용 가능" },
  { emoji: "🎙️", title: "음성·자막·MP4", desc: "본인 키 내레이션 · 자막 · 배경음악 · 브라우저 MP4 · 업로드 문구", state: "사용 가능" },
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
          <h2>💡 주제·대본 사용법</h2>
          <div className="avatar-tip"><span className="avatar">🤖</span><div><strong>꿀팁! 주제 문구에 숫자를 넣어 보세요</strong><p className="muted">「아침 습관 5가지」처럼 숫자가 있으면 구성이 TOP N 리스트·카드 5장으로 자동 맞춰집니다. 「~하는 법」은 단계별 방법, 「썰·실화·반전」은 스토리로 바뀌어요. 직접 바꾸면 그 값이 유지됩니다.</p></div></div>
          <ol className="stack" style={{ gap: 6, margin: 0, paddingLeft: 18 }}>
            <li><strong>분야 고르기</strong> — 14개 분야 칩 중 하나를 누릅니다. 키워드나 참고 자료(기사·메모, txt·md 파일)를 넣으면 그 내용을 근거로 씁니다.</li>
            <li><strong>주제 8개 추천받기</strong> — 마음에 드는 카드를 누르거나 주제를 직접 입력합니다.</li>
            <li><strong>대본 만들기</strong> — 말투·구성·카드 수(3~8장)와 목표 길이(약 30·45·60초 — 고르면 내레이션 글자 수를 그 길이에 맞춤)를 확인하고 누르면 인트로·카드·아웃트로 대본과 해시태그가 나옵니다.</li>
            <li><strong>다듬고 저장</strong> — 화면 제목은 짧게, 자세한 내용은 내레이션에. [보관함에 저장]으로 보관합니다.</li>
          </ol>
          <p className="muted" style={{ fontSize: 12 }}>🎨 <strong>배경</strong>: [🎨 디자인·배경]에서 배경 방식(테마만/전체 1장/장면마다)을 고르고 [AI로 장면 설명 만들기]를 누르면 장면마다 스톡 검색어와 AI 이미지 설명이 채워집니다. [검색]으로 Pexels·Pixabay 무료 영상·사진을 고르거나 [AI 이미지]로 만들고 [배경 저장]을 누르세요. 스톡 키는 무료로 발급됩니다(🔑 API키등록·플랫폼연동의 발급 매뉴얼).</p>
          <p className="muted" style={{ fontSize: 12 }}>🎙️ <strong>음성·자막·음악</strong>: [🎙️ 음성·자막·영상]에서 음성 모델·목소리·빠르기를 고르고 [음성 없는 장면 모두 만들기]를 누르면 장면마다 내레이션이 만들어지고 장면 길이가 목소리에 맞춰집니다. 자막 스타일·위치·크기를 고르고, 내 음악 파일을 올리면 목소리가 나올 때 자동으로 작게 깔립니다. [소리와 재생]으로 확인하고 [저장]하세요. 마지막으로 [MP4 만들기]를 누르면 이 브라우저 안에서 1080×1920 세로 MP4(목소리·자막·배경음악 포함)가 만들어지고, [MP4 내려받기]로 저장합니다(최신 크롬·엣지, 만드는 동안 탭 유지). [업로드 문구 만들기]를 누르면 제목 후보 5개·설명란·해시태그·검색 태그가 만들어져, 눌러서 복사해 유튜브에 붙여 넣을 수 있습니다.</p>
          <p className="muted" style={{ fontSize: 12 }}>📅 <strong>발행 계획</strong>: [📅 발행 계획]에서 채널 단계·분야(1~3개)·하루 편수·기간을 고르고 [계획 만들기]를 누르면 AI가 운영 전략과 날짜별 주제를 만들고, 분야별 추천 시간대에 배치해 저장합니다(한 번에 30개까지). 오늘 이미 지난 시각은 다음 추천 시각으로 자동으로 미룹니다. ✏️로 주제·날짜·시각을 고치고 🗑로 일정에서 빼며, [+ 주제 추가]로 직접 넣을 수 있습니다. 일괄 대본에도 목표 길이를 고를 수 있고, 자동 배경은 검색어와 태그가 가장 많이 맞는 스톡을 고릅니다. 주제를 골라 만들 단계(📝 대본은 항상, 🎨 배경·🎙️ 음성·🎬 MP4는 선택)를 켜고 [N편 만들기]를 누르면 순서대로 처리해 보관함에 저장하고, 예상 요청 횟수를 미리 보여 줍니다. 만든 MP4는 목록의 [MP4 내려받기]로 저장하세요.</p>
          <p className="muted" style={{ fontSize: 12 }}>🎬 <strong>장면 편집</strong>: 저장한 대본을 [🎬 장면 편집]에서 고르면 실제 쇼츠 화면으로 재생됩니다. 테마 8가지·카드 레이아웃 6가지·제목 글꼴 5가지·제목 효과를 고르고 [디자인 저장]을 누르세요. [세이프에어리어]를 켜면 유튜브 버튼·제목에 가려지는 곳이 빨갛게 표시됩니다.</p>
          <p className="muted" style={{ fontSize: 12 }}>✍️ <strong>내 지침</strong>: 분야마다 말투·금지어·구성 규칙을 저장해 두고 「내 지침 사용」을 켜면 기본 규칙보다 우선 적용됩니다. 📜 <strong>내 대본으로 만들기</strong>: 이미 쓴 대본을 한 줄 = 한 장면으로 바꿉니다(AI 사용 안 함).</p>
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
            <div className="list-item"><div><strong>스토리가 자연스럽지 않아요</strong><small>구성을 「스토리」로 두고, 설정에서 상위 모델(Gemini 3.8 Flash · Claude Sonnet 5.5 등)을 고르면 흐름이 더 매끄럽습니다.</small></div></div>
          </div>
        </section>
      </div>
    </>
  );
}
