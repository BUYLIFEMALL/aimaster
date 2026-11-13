import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { APP_VERSION } from "@/lib/version";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="gd-step">
      <span className="gd-num">{n}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">⚡ CYBER THUMBNAIL NEON LAB MANUAL</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>📖 연동 & 사용 매뉴얼</span>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(56,189,248,0.15)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.3)", fontWeight: 800 }}>
            {APP_VERSION}
          </span>
        </h1>
        <p>영상 주제와 시청 타겟을 고르면 AI가 A/B 두 가지 전략으로 문구가 들어간 썸네일 2종을 만들고, 대본으로 유튜브 제목·설명·태그(SEO 전략)까지 준비해 줍니다.</p>
      </div>

      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(167,139,250,0.08) 100%)", borderColor: "rgba(56,189,248,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, color: "#38BDF8", marginBottom: 4 }}>⚡ 썸네일 제작 3단계</h3>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>1 주제·피사체 → 2 타겟·전략(A/B 문구) → 3 썸네일 2종 생성·수정·다운로드. 좌측 메뉴의 1·2·3번이 같은 순서입니다.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(56,189,248,0.3)", fontSize: 11, color: "#38BDF8" }}>#A안_숫자·이득</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(167,139,250,0.3)", fontSize: 11, color: "#A78BFA" }}>#B안_호기심</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(56,189,248,0.3)", fontSize: 11, color: "#38BDF8" }}>#가로16:9</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(16,185,129,0.3)", fontSize: 11, color: "#10B981" }}>#세로9:16</span>
          </div>
        </div>
      </div>

      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong style={{ color: "#F8FAFC" }}>빠른 바로가기</strong>
          <a href="#key">1. 키 등록(처음 한 번)</a>
          <a href="#quick">2. 썸네일 만들기</a>
          <a href="#options">3. 옵션 설명</a>
          <a href="#edit">4. 수정·버전·보관</a>
          <a href="#seo">5. SEO 전략</a>
          <a href="#tips">6. 잘 나오는 요령</a>
          <a href="#faq">7. 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>1. Gemini API 키 등록 (처음 한 번)</h2>
          <p className="gd-lead">전략 분석·SEO 전략·이미지 생성은 모두 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 이 프로그램에 필요한 키는 이것 하나입니다. 키가 없으면 생성 버튼을 눌렀을 때 등록 안내가 나옵니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기">
              <code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인한 뒤 새 API 키를 만들고, <code>AIza…</code>로 시작하는 키를 복사합니다.
            </Step>
            <Step n={2} title="이 프로그램에 등록">
              좌측 메뉴 [🔑 API키등록·플랫폼연동]에서 키를 붙여 넣고 [키 등록]을 누릅니다.
            </Step>
            <Step n={3} title="확인">
              「등록됨」과 키 일부가 보이면 끝입니다. 같은 화면에서 언제든 [키 바꾸기]·[키 삭제]를 할 수 있습니다.
            </Step>
          </ol>
          {GEMINI_GUIDE_URL && (
            <div className="actions" style={{ marginTop: 14 }}>
              <GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" />
            </div>
          )}
          <p className="gd-warn">⚠️ 이미지 생성은 Gemini 이미지 모델을 쓰며, Google 계정에 결제(유료) 설정이 되어 있어야 생성될 수 있습니다. [썸네일 2종 생성하기]는 이미지 2건, [다시 생성]·[AI 수정 요청]은 1건씩 본인 키 사용량으로 계산됩니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>2. 썸네일 만들기 (3단계)</h2>
          <ol className="gd-steps">
            <Step n={1} title="새 프로젝트를 열고 주제와 피사체를 정합니다">
              「🏠 NLE 워크스페이스」에서 [새 프로젝트]를 누르면 제작 화면이 열립니다(좌측 메뉴 「1 주제 · 피사체 훅」은 가장 최근 프로젝트를 엽니다). 영상 주제를 한두 문장으로 쓰거나 [대본 문서 올리기 (.txt .md .csv)]로 대본을 붙입니다(앞 30,000자까지 분석). 썸네일에 사람·동물·사물을 넣을지, 글자와 그래픽만 쓸지 고릅니다.
            </Step>
            <Step n={2} title="시청 타겟을 고르고 [전략 생성]을 누릅니다">
              10대~20대 초반 / 20대 후반~40대 / 50~60대 이상(시니어) / 전연령 중 하나를 고르면 문구 톤과 글자 크기·색 대비 규칙이 달라집니다. 「전략 분석 요약」과 A안·B안 문구가 나옵니다(Gemini 텍스트 1회).
            </Step>
            <Step n={3} title="A/B 문구를 다듬습니다">
              A안은 숫자·이득 중심, B안은 호기심 중심입니다. 메인 문구는 3~5단어가 알맞고, 길면 칸 아래에 줄이라는 안내가 나옵니다. 마음에 들지 않으면 [다른 문구로 다시 제안]을 누릅니다.
            </Step>
            <Step n={4} title="[썸네일 2종 생성하기]를 누릅니다">
              보통 20~60초 뒤 A·B 이미지가 나란히 나옵니다. 마음에 드는 쪽을 [다운로드 (JPG)]로 받습니다. 한쪽만 다시 만들려면 그 칸의 [다시 생성]을 누릅니다.
            </Step>
          </ol>
          <p className="gd-tip">💡 입력·전략·만든 이미지는 프로젝트에 자동 저장됩니다. 「🏠 NLE 워크스페이스」(프로젝트 목록)에서 다시 열 수 있습니다.</p>
        </section>

        <section id="options" className="card">
          <h2>3. 옵션 설명</h2>
          <div className="gd-cards">
            <article>
              <h3>시청 타겟</h3>
              <p>시니어를 고르면 글자를 매우 크고 굵게, 노랑/검정 같은 강한 대비로 만듭니다. 10대~20대 초반은 고채도·역동적인 연출을 씁니다.</p>
            </article>
            <article>
              <h3>피사체</h3>
              <p>사람은 성별 등을 정할 수 있고, 동물·사물은 종류를 직접 적습니다(예: 귀여운 골든 리트리버). 「없음」은 글자와 그래픽 위주로 만듭니다.</p>
            </article>
            <article>
              <h3>추가 스타일</h3>
              <p>없음 · 단색 강조 · 네온 글로우 · 손그림/낙서 중에서 고릅니다.</p>
            </article>
            <article>
              <h3>화면 비율</h3>
              <p>가로 16:9는 유튜브 썸네일, 세로 9:16은 쇼츠·릴스 표지용입니다. 세로는 폭이 좁아 메인 문구 2~4단어, 서브 문구 10자 이내를 권합니다(넘으면 생성 전에 한 번 물어봅니다).</p>
            </article>
            <article>
              <h3>해상도</h3>
              <p>2K는 고화질이지만 느립니다. 빠르게 시안을 보려면 1K로 먼저 만드세요.</p>
            </article>
            <article>
              <h3>문구 넣기 / 배경만</h3>
              <p>기본은 이미지에 문구를 직접 그려 넣습니다. 한글이 어색하게 나오면 체크를 풀어 글자 없는 배경만 만든 뒤 다른 편집 도구에서 글자를 얹으세요.</p>
            </article>
          </div>
        </section>

        <section id="edit" className="card">
          <h2>4. 수정 · 버전 · 보관</h2>
          <ul className="gd-list">
            <li><b>AI 수정 요청</b>: 결과 칸 아래에 「텍스트를 노란색으로 바꿔줘」, 「표정을 더 놀라게 해줘」처럼 적고 [수정]을 누르면 지시대로 다시 그립니다. 일부만 고치는 편집이 아니라 전체를 다시 그리므로 미세한 차이가 생길 수 있습니다(이미지 1건 사용).</li>
            <li><b>무료 지우기</b>: [무료 지우기]를 누르면 바나나 캔버스의 지우기 창이 새 창으로 열립니다. 거기서 글자·물체를 지우면 결과가 새 버전으로 돌아옵니다. 내 PC에서 처리되어 AI 비용이 들지 않습니다. 새 창이 막히면 주소창의 팝업 허용을 눌러 주세요.</li>
            <li><b>문구를 바꿨을 때</b>: 이미지를 만든 뒤 문구를 고치면 결과 칸에 「문구가 바뀌었습니다」가 나옵니다. [다시 생성]을 눌러야 새 문구로 만들어집니다.</li>
            <li><b>버전</b>: A안·B안마다 최근 5개 버전이 보관됩니다. 버전 버튼을 누르면 이전 버전으로 돌아갈 수 있습니다.</li>
            <li><b>세로 표지 쓰기</b>: 세로 9:16으로 만든 결과 아래에 릴스 표지(YOUTUBE Shots 자동화)와 유튜브 쇼츠 표지(컴퓨터의 YouTube 스튜디오) 올리는 방법과 바로가기가 나옵니다.</li>
            <li><b>보관 기간</b>: 프로젝트는 최대 30개까지 만들 수 있습니다. 일반 회원은 만든 자료 용량 500MB, 프로젝트를 만든 날부터 30일이 지나면 이미지와 함께 자동 삭제됩니다(매일 새벽 정리). 더 오래 두려면 메인 사이트의 저장 구독으로 연장할 수 있습니다. 필요한 이미지는 미리 JPG로 받아 두세요.</li>
          </ul>
        </section>

        <section id="seo" className="card">
          <h2>5. SEO 전략으로 업로드 준비</h2>
          <ul className="gd-list">
            <li><b>어디서</b>: 좌측 메뉴 「SEO 전략 (제목·설명·태그)」. 대본·기획안·아이디어를 붙여 넣거나 txt·md 파일을 불러옵니다(앞 30,000자까지).</li>
            <li><b>무엇이 나오나</b>: [SEO 전략 3가지 만들기]를 누르면 전략 3가지마다 영상 제목, 설명, 해시태그, 스튜디오 태그, 고정 댓글, 썸네일 연출안이 나오고, 세 전략 공통 「종합 메타데이터」도 함께 나옵니다. 항목마다 복사 버튼으로 유튜브 스튜디오에 붙여 넣으세요(Gemini 텍스트 1회).</li>
            <li><b>썸네일로 이어 가기</b>: 마음에 드는 전략의 [이 전략으로 썸네일 만들기]를 누르면 그 제목과 연출안을 주제로 새 프로젝트가 만들어지고, 대본이 참고 문서로 붙은 채 제작 화면이 열립니다.</li>
            <li><b>다른 프로그램에서 대본 받기</b>: 「쇼츠 떡상 분석·대본 자동화」의 [📤 썸네일 만들기], 「AI 쇼츠 원스톱 제작」에서 넘긴 대본은 이 화면의 대본 칸에 자동으로 들어옵니다. AI 호출은 회원님이 버튼을 눌러야 시작됩니다.</li>
            <li><b>저장</b>: SEO 전략 결과 자체는 저장되지 않습니다. 필요한 문구는 복사해 두세요(썸네일 프로젝트는 자동 저장).</li>
          </ul>
        </section>

        <section id="tips" className="card">
          <h2>6. 결과가 잘 나오는 요령</h2>
          <div className="gd-cards" style={{ marginTop: 14 }}>
            <article>
              <h3>01. 문구는 짧게</h3>
              <p>모바일 유튜브 피드에서는 긴 글자가 잘 읽히지 않습니다. 메인 문구는 3~5단어(세로는 2~4단어)로 줄이세요.</p>
            </article>
            <article>
              <h3>02. 주제에 대상·결과·숫자</h3>
              <p>예: 「직장인 점심 15분 도시락 5가지」. 대본을 함께 올리면 내용에 맞는 구체적인 문구가 나옵니다.</p>
            </article>
            <article>
              <h3>03. 우하단은 비워 두기</h3>
              <p>모바일 유튜브 앱은 썸네일 오른쪽 아래에 영상 길이 표시를 겹쳐 보여 주므로, 중요한 글자가 그 자리에 오지 않게 확인하세요.</p>
            </article>
          </div>
        </section>

        <section className="card">
          <h2>⚖️ 썸네일 제작 Do&apos;s &amp; Don&apos;ts</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 12 }}>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10B981", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                <CheckCircle2 size={16} />
                <span>권장하는 접근법 (Do&apos;s)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>
                <li>휴대폰 크기로 줄여 봤을 때도 메인 문구가 또렷이 읽히는지 확인하세요.</li>
                <li>배경과 글자의 밝기 차이를 크게 두어 눈에 잘 띄게 하세요.</li>
              </ul>
            </div>

            <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F43F5E", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                <AlertTriangle size={16} />
                <span>피해야 할 접근법 (Don&apos;ts)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>
                <li>실존 인물·연예인·상표 이름은 AI 안전 정책으로 막힐 수 있습니다. 일반적인 인물 설정을 쓰세요.</li>
                <li>영상 내용과 다른 과장된 썸네일은 시청자가 바로 나가게 만듭니다.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className="card">
          <h2>7. 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details>
              <summary>「API 키 등록이 필요합니다」라고 나와요.</summary>
              <p>1번 순서대로 본인 Gemini 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않으며, 운영자 키로 대신 처리되지도 않습니다.</p>
            </details>
            <details>
              <summary>「키가 올바르지 않거나 권한이 없습니다」라고 나와요.</summary>
              <p>키를 다시 확인하고, Google AI Studio에서 해당 키의 결제(유료) 설정이 되어 있는지 확인하세요. 이미지 생성은 무료 한도가 없을 수 있습니다.</p>
            </details>
            <details>
              <summary>이미지가 만들어지지 않거나 안전 정책 안내가 나와요.</summary>
              <p>같은 버튼을 한 번 더 눌러 보세요. 계속되면 문구를 줄이거나, 피사체를 사물이나 「없음」으로 바꾸거나, 문구 넣기 체크를 풀어 배경만 만들어 보세요.</p>
            </details>
            <details>
              <summary>글자가 깨지거나 철자가 틀려요.</summary>
              <p>[AI 수정 요청]에 「메인 문구를 ‘○○○’로 정확히 써줘」처럼 적어 보세요. 해결되지 않으면 배경만 만들고 글자를 직접 얹는 방법을 권합니다. 잘못 들어간 글자만 없애려면 [무료 지우기]를 쓰세요.</p>
            </details>
            <details>
              <summary>비용은 어디서 나가나요?</summary>
              <p>모두 회원님 본인 Gemini 키로 호출되고 요금은 본인 Google 계정에 청구됩니다. 전략 생성·SEO 전략은 텍스트 1회, 썸네일 2종 생성은 이미지 2건, 다시 생성·AI 수정 요청은 이미지 1건씩입니다. 무료 지우기는 AI 비용이 없습니다.</p>
            </details>
            <details>
              <summary>예전 「AI 유튜브 썸네일 프로」를 쓰던 사람은 어떻게 하나요?</summary>
              <p>이 프로그램의 「SEO 전략」 메뉴로 합쳐졌습니다. 같은 Gemini 키를 그대로 쓰므로 다시 등록할 필요가 없습니다.</p>
            </details>
            <details>
              <summary>PC와 휴대폰에서 같이 로그인해도 되나요?</summary>
              <p>같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓰실 수 있습니다. 같은 종류의 기기에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.</p>
            </details>
          </div>
        </section>
      </div>
    </>
  );
}
