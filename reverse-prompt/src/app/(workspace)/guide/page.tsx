import { BookOpen, Sparkles, KeyRound, Cpu, Layers, SlidersHorizontal, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { SIZE_LIMIT } from "@/lib/rpa/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MB = 1048576;

export default function GuidePage() {
  return (
    <div className="gd">
      {/* 1. 가이드 히어로 배너 */}
      <div className="studio-hero" style={{ marginBottom: "0px" }}>
        <div className="studio-hero-title">
          <Sparkles size={26} style={{ color: "#f59e0b" }} />
          <span>AI 리버스 프롬프트 완전 마스터 가이드</span>
        </div>
        <p className="studio-hero-desc">
          이미지·동영상·오디오 미디어를 멀티모달 AI로 심층 역분석하여, Midjourney, Flux, Sora, Suno 등 주요 생성 AI에 바로 사용할 수 있는 최적의 프롬프트와 파라미터를 도출하는 완벽 활용 매뉴얼입니다.
        </p>
        <div className="studio-hero-badges">
          <span className="badge-tag amber"><Sparkles size={12} /> 사용 매뉴얼</span>
          <span className="badge-tag violet"><Layers size={12} /> 대상 도구 9가지 선택</span>
          <span className="badge-tag cyan"><Cpu size={12} /> 멀티모달 3종 미디어 역분석</span>
        </div>
      </div>

      {/* 2. 빠른 목차 바 */}
      <nav className="gd-toc" aria-label="가이드 목차">
        <strong>바로가기:</strong>
        <a href="#pipeline">1. 4단계 사용 순서</a>
        <a href="#key">2. Gemini API 키 등록</a>
        <a href="#tools">3. 대상 도구 9가지</a>
        <a href="#options">4. 분석 옵션</a>
        <a href="#send">5. 결과 활용·다른 프로그램으로 보내기</a>
        <a href="#limits">6. 파일 규격·보관 기간</a>
        <a href="#faq">7. 자주 묻는 질문</a>
      </nav>

      {/* 3. 4단계 표준 역추출 파이프라인 */}
      <section id="pipeline" className="card">
        <h2>1. 4단계 사용 순서</h2>
        <p className="gd-lead">
          복잡한 프롬프트 작성 없이, 마음에 드는 레퍼런스 미디어 하나로 4단계를 거쳐 완벽한 생성 AI 명령어를 추출합니다.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginTop: "16px" }}>
          <div style={{ background: "#0f141f", border: "1px solid var(--line)", borderRadius: "12px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="gd-num">1</span>
              <strong style={{ fontSize: "14px", color: "#f1f5f9" }}>미디어 업로드</strong>
            </div>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.55" }}>
              [파일 올리기] 칸을 눌러 파일을 고르거나 끌어다 놓습니다. 캡처한 이미지는 Ctrl+V로 바로 붙여 넣을 수 있습니다. 파일 종류(이미지·동영상·오디오)는 자동으로 구분됩니다.
            </p>
          </div>

          <div style={{ background: "#0f141f", border: "1px solid var(--line)", borderRadius: "12px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="gd-num">2</span>
              <strong style={{ fontSize: "14px", color: "#f1f5f9" }}>멀티모달 AI 심층 분석</strong>
            </div>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.55" }}>
              Google Gemini Vision/Audio 모델이 피사체, 조명, 구도, 색감, 음향 구조를 전문가 시각으로 정밀 분해합니다.
            </p>
          </div>

          <div style={{ background: "#0f141f", border: "1px solid var(--line)", borderRadius: "12px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="gd-num">3</span>
              <strong style={{ fontSize: "14px", color: "#f1f5f9" }}>타겟 AI 프롬프트 최적화</strong>
            </div>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.55" }}>
              Midjourney 파라미터, DALL-E 자연어, Flux 태그, Suno 메타태그 등 타겟 도구 맞춤형 영어 프롬프트를 자동 생성합니다.
            </p>
          </div>

          <div style={{ background: "#0f141f", border: "1px solid var(--line)", borderRadius: "12px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="gd-num">4</span>
              <strong style={{ fontSize: "14px", color: "#f1f5f9" }}>실시간 편집 & 재조합</strong>
            </div>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.55" }}>
              결과 칸에서 프롬프트를 직접 고친 뒤 [수정 저장·명령어 재조합]을 누르면 기록에도 반영됩니다. [복사], [JSON 복사], [JSON 파일 저장], [Markdown 요약 복사] 버튼으로 가져갑니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 최상위 보안 원칙 (BYOK Standard) 연동 가이드 */}
      <section id="key" className="card">
        <h2>2. Gemini API 키 등록 (본인 키 사용)</h2>
        <p className="gd-lead">
          AIMaster의 <b>절대 불변 최상위 규칙</b>에 따라, AI 분석은 <b>회원님 본인의 Google Gemini API 키</b>로만 독립 동작합니다. 타 회원과 키나 생성 데이터가 절대 공유되지 않습니다.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginTop: "14px" }}>
          <div style={{ background: "#141a27", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px 18px" }}>
            <strong style={{ color: "#f59e0b", fontSize: "13.5px" }}>1단계: Google AI Studio 접속</strong>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "6px" }}>
              <code>aistudio.google.com/apikey</code>에 본인 Google 계정으로 로그인한 뒤 [Create API key]를 클릭합니다.
            </p>
          </div>

          <div style={{ background: "#141a27", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px 18px" }}>
            <strong style={{ color: "#f59e0b", fontSize: "13.5px" }}>2단계: 키 복사 및 등록</strong>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "6px" }}>
              발급된 <code>AIzaSy...</code> 키를 복사하여 왼쪽 메뉴의 [API키등록·플랫폼연동] 메뉴에서 등록합니다.
            </p>
          </div>

          <div style={{ background: "#141a27", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px 18px" }}>
            <strong style={{ color: "#f59e0b", fontSize: "13.5px" }}>3단계: 안전한 보관 및 즉시 사용</strong>
            <p style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "6px" }}>
              키는 본인 계정에 연결해 보관하며, 언제든 등록·교체·삭제할 수 있습니다.
            </p>
          </div>
        </div>

        <ul className="gd-list" style={{ marginTop: "14px" }}>
          <li><b>비용 안내</b>: [분석 시작]을 누를 때마다 회원님 Gemini 키로 AI를 1회 호출합니다. 사용 요금과 한도는 회원님 Google 계정 기준으로 적용되며, 이 프로그램이 따로 받는 AI 요금은 없습니다.</li>
          <li><b>한 번만 등록</b>: 여기서 등록한 Gemini 키는 회원님 계정에 저장되어, Gemini 키를 쓰는 다른 AIMaster 프로그램에서도 다시 등록하지 않고 사용합니다.</li>
        </ul>

        <div className="actions" style={{ marginTop: "16px" }}>
          <a href="/settings" className="button primary">
            <KeyRound size={15} /> 🔑 본인 Gemini 키 등록하러 가기
          </a>
          {GEMINI_GUIDE_URL && <GuideLinkButton url={GEMINI_GUIDE_URL} label="Google Gemini API 키 발급 상세 가이드 (새 창)" />}
        </div>
      </section>

      {/* 5. 10대 지원 생성 AI 도구별 특성 */}
      <section id="tools" className="card">
        <h2>3. 대상 도구 9가지와 프롬프트 특성</h2>
        <p className="gd-lead">
          생성 AI마다 잘 반응하는 문장 구조가 다릅니다. [분석 옵션]의 「대상 도구」에서 고른 도구에 맞는 형식으로 프롬프트를 만듭니다. 올린 파일 종류에 따라 고를 수 있는 도구가 달라집니다 — 이미지 3가지(Midjourney, DALL·E / GPT Image, Flux / Stable Diffusion), 동영상 4가지(Sora, Veo, Runway, Kling), 오디오 2가지(Suno, Udio).
        </p>

        <div className="gd-cards">
          <article>
            <h3>Midjourney</h3>
            <p>쉼표로 이어 쓴 묘사 뒤에 <code>--ar</code>, <code>--stylize</code> 등 파라미터를 붙인 전체 명령어까지 만들어 줍니다. 화면비·Stylize·Chaos 값도 따로 보여 줍니다.</p>
          </article>
          <article>
            <h3>DALL·E / GPT Image</h3>
            <p>단어 나열보다는 배경, 피사체, 조명, 디테일을 자연스러운 영어 문장으로 상세히 서술하는 문장형 프롬프트에 최적화됩니다.</p>
          </article>
          <article>
            <h3>Flux / Stable Diffusion</h3>
            <p>품질 태그, 스타일 태그, 조명 및 렌더링 엔진 키워드가 쉼표(comma)로 구분되는 정밀 태그형 프롬프트로 변환합니다.</p>
          </article>
          <article>
            <h3>Sora / Veo</h3>
            <p>시점 변화, 카메라 무빙(팬, 틸트, 돌리), 피사체의 연속적인 동작 흐름과 프레임 속도를 시간순으로 묘사합니다.</p>
          </article>
          <article>
            <h3>Runway / Kling</h3>
            <p>샷 유형(클로즈업, 와이드샷), 렌즈 특성, 조명 무드 및 역동적인 물리 법칙을 강조한 시네마틱 프롬프트를 편성합니다.</p>
          </article>
          <article>
            <h3>Suno / Udio</h3>
            <p>음악의 주 장르, 세부 서브장르, BPM, 악기 레이어(리드, 베이스, 드럼), 보컬 스타일 메타태그를 정확히 추출합니다.</p>
          </article>
        </div>
      </section>

      {/* 6. 옵션 설명 */}
      <section id="options" className="card">
        <h2>4. 분석 옵션</h2>
        <div className="gd-table">
          <div>
            <b>프롬프트 길이: 간결</b>
            <span>핵심 피사체와 지배적인 화풍/장르 위주로 25~45단어로 압축합니다. AI의 자율적인 상상력을 유도할 때 유리합니다.</span>
          </div>
          <div>
            <b>프롬프트 길이: 표준 (권장)</b>
            <span>피사체, 배경, 조명, 색감의 균형 잡힌 60~100단어로 구성하여 원본 레퍼런스의 무드를 가장 안정적으로 재현합니다.</span>
          </div>
          <div>
            <b>프롬프트 길이: 상세</b>
            <span>렌즈 mm, 조명 각도, 미세한 질감, 의상 디테일까지 120~180단어로 정밀 묘사하여 원본을 극도로 유사하게 복각합니다.</span>
          </div>
          <div>
            <b>설명 언어</b>
            <span>「한국어」를 고르면 분석 설명(피사체·조명·구도 등)은 한국어로, 생성 AI에 넣는 프롬프트는 영어로 나옵니다. 「English」를 고르면 설명도 영어로 나옵니다.</span>
          </div>
          <div>
            <b>AI 모델</b>
            <span>기본은 빠른 Flash 모델입니다. 더 꼼꼼한 분석이 필요하면 Pro 모델을 고르되, 시간이 더 걸리고 Gemini 사용 요금이 더 나올 수 있습니다. 고른 모델을 쓸 수 없으면 다음 모델로 자동으로 넘어가며, 실제로 쓴 모델 이름은 결과 제목 옆에 표시됩니다.</span>
          </div>
          <div>
            <b>추가 지시 (메모)</b>
            <span>"인물의 의상에 집중", "배경과 건축 구조 위주", "조명 톤만 차용" 등 회원님이 강조하고 싶은 부분을 직접 지시할 수 있습니다.</span>
          </div>
        </div>
      </section>

      {/* 결과 활용·다른 프로그램으로 보내기 */}
      <section id="send" className="card">
        <h2>5. 결과 활용·다른 프로그램으로 보내기</h2>
        <p className="gd-lead">
          이미지 분석 결과에는 프롬프트를 다른 AIMaster 프로그램으로 넘기는 버튼이 함께 나옵니다. 모두 새 창으로 열리고, 프롬프트 글자만 넘어가며 자동으로 생성되지는 않습니다(넘어간 프로그램에서 직접 생성 버튼을 눌러야 하고, 그 프로그램의 이용 권한과 본인 키가 필요합니다).
        </p>
        <div className="gd-table">
          <div>
            <b>🍌 바나나 캔버스로 보내기</b>
            <span>지금 편집 칸의 프롬프트를 바나나 캔버스 「이미지 생성」 아이디어 칸에 넣어 엽니다. 프롬프트가 600자를 넘으면 버튼 대신 안내가 나오니, 복사해서 줄여 쓰세요.</span>
          </div>
          <div>
            <b>🎨 이미지 스튜디오에서 생성</b>
            <span>같은 프롬프트를 AI 이미지 스튜디오로 넘겨, 그쪽에서 엔진과 모델을 골라 생성합니다.</span>
          </div>
          <div>
            <b>🎨 스타일 정밀 분석으로 보내기</b>
            <span>방금 올린 원본 이미지를 이미지 스타일 분석기로 넘겨 색 팔레트 등 더 깊은 스타일 분석을 합니다. 이번에 직접 올린 파일이 있을 때만 보이고, [내 분석 기록]에서 다시 연 결과에는 원본이 남아 있지 않아 보이지 않습니다.</span>
          </div>
          <div>
            <b>기록에서 다시 열기·즐겨찾기</b>
            <span>[내 분석 기록]에서 [열기]를 누르면 저장된 결과를 다시 보고 수정·복사할 수 있습니다. 별(★) 버튼으로 즐겨찾기를 하면 100건 한도 정리에서 빠지고, [즐겨찾기만] 버튼으로 모아 볼 수 있습니다.</span>
          </div>
        </div>
      </section>

      {/* 7. 파일 규격 및 개인정보 원칙 */}
      <section id="limits" className="card">
        <h2>6. 파일 규격·보관 기간</h2>
        <ul className="gd-list">
          <li><b>지원 파일 규격</b>: 이미지(JPG, PNG, WEBP, HEIC) 최대 {SIZE_LIMIT.image / MB}MB, 동영상(MP4, MOV, WEBM) 최대 {SIZE_LIMIT.video / MB}MB, 오디오(MP3, WAV, AAC, FLAC) 최대 {SIZE_LIMIT.audio / MB}MB.</li>
          <li><b>1시간 내 자동 파기</b>: 회원이 업로드한 원본 미디어 파일은 비공개 임시 버킷에만 저장되며 <b>1시간 내 완전히 자동 삭제</b>됩니다.</li>
          <li><b>분석 기록 보관</b>: 분석 결과(글자)와 작은 미리보기만 기록에 남고, 원본 파일은 기록에 저장되지 않습니다. 기록은 최근 100건까지 보관하며, <b>만든 날부터 30일이 지나면 즐겨찾기를 포함해 자동 삭제</b>됩니다. 오래 두고 쓸 프롬프트는 [JSON 파일 저장]이나 복사로 따로 보관해 주세요.</li>
          <li><b>회원별 분리</b>: 분석 기록과 프롬프트는 다른 회원과 공유되지 않으며 본인 계정에서만 보입니다.</li>
        </ul>
      </section>

      {/* 8. 자주 묻는 질문 (FAQ) */}
      <section id="faq" className="card">
        <h2>7. 자주 묻는 질문</h2>
        <div className="gd-faq">
          <details open>
            <summary>Q. 원본 이미지와 100% 동일하게 생성되나요?</summary>
            <p>생성 AI 모델마다 자체 학습된 스타일과 가중치가 다르므로 100% 동일한 복제본이 나오지는 않습니다. 하지만 원본의 조명, 구도, 색감, 피사체의 본질적인 분위기를 가장 흡사하게 재현하도록 유도합니다.</p>
          </details>
          <details>
            <summary>Q. "API 키 등록이 필요합니다"라는 안내가 나옵니다.</summary>
            <p>본인 소유의 Google Gemini API 키가 아직 등록되지 않은 상태입니다. 왼쪽 메뉴의 [API키등록·플랫폼연동] 메뉴에서 키를 등록하신 후 다시 시도해 주세요.</p>
          </details>
          <details>
            <summary>Q. 동영상이나 오디오 분석 시 시간이 오래 걸립니다.</summary>
            <p>동영상과 오디오는 파일을 AI 쪽에 올리고 처리가 끝나기를 기다린 뒤 분석하므로 이미지보다 오래 걸립니다(처리 대기는 최대 약 4분). 창을 닫지 말고 기다려 주세요. 「AI 응답이 늦어 중단되었습니다」가 나오면 파일을 더 짧게 잘라 다시 시도해 주세요. 진행 중에는 [취소] 버튼으로 멈출 수 있습니다.</p>
          </details>
          <details>
            <summary>Q. 분석 후 프롬프트를 일부 수정하고 싶습니다.</summary>
            <p>결과 화면의 텍스트 영역에서 프롬프트나 부정 프롬프트를 원하는 대로 수정한 뒤, [수정 저장·명령어 재조합] 버튼을 누르면 Midjourney 전체 명령어와 파라미터가 실시간으로 재조립됩니다.</p>
          </details>
          <details>
            <summary>Q. 분석 기록은 어디서 확인하나요?</summary>
            <p>분석 결과는 [내 분석 기록] 메뉴에 자동 저장됩니다(최근 100건, 만든 날부터 30일 보관). [열기]로 다시 열어 JSON 파일로 저장하거나 Markdown 요약을 복사할 수 있습니다.</p>
          </details>
          <details>
            <summary>Q. "Gemini 사용 한도를 초과했습니다"라고 나옵니다.</summary>
            <p>회원님 Google 계정의 Gemini 사용 한도에 걸린 경우입니다. 잠시 뒤 다시 시도하거나 Google AI Studio에서 본인 키의 한도를 확인해 주세요. 운영자나 다른 회원의 키로 대신 처리되지 않습니다.</p>
          </details>
          <details>
            <summary>Q. 지원하지 않는 형식이라고 나오거나 파일이 너무 크다고 나옵니다.</summary>
            <p>위 「6. 파일 규격·보관 기간」의 형식과 크기 안에서만 분석할 수 있습니다. 동영상은 짧게 자르거나 해상도를 낮추고, 오디오는 구간을 잘라 내고, 이미지는 크기를 줄여 다시 올려 주세요.</p>
          </details>
          <details>
            <summary>Q. PC와 휴대폰에서 같이 쓸 수 있나요?</summary>
            <p>같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
