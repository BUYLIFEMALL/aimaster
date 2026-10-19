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
          <span className="badge-tag amber"><Sparkles size={12} /> v1.10 GUIDE</span>
          <span className="badge-tag violet"><Layers size={12} /> 10대 AI 생성 도구 지원</span>
          <span className="badge-tag cyan"><Cpu size={12} /> 멀티모달 3종 미디어 역분석</span>
        </div>
      </div>

      {/* 2. 빠른 목차 바 */}
      <nav className="gd-toc" aria-label="가이드 목차">
        <strong>바로가기:</strong>
        <a href="#pipeline">① 4단계 파이프라인</a>
        <a href="#key">② Gemini API 키 등록</a>
        <a href="#tools">③ 10대 지원 AI 도구</a>
        <a href="#options">④ 분석 옵션 & 길이</a>
        <a href="#limits">⑤ 파일 규격 & 보안</a>
        <a href="#faq">⑥ 자주 묻는 질문(FAQ)</a>
      </nav>

      {/* 3. 4단계 표준 역추출 파이프라인 */}
      <section id="pipeline" className="card">
        <h2>① 4단계 표준 리버스 프롬프트 파이프라인</h2>
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
              이미지·동영상·오디오 파일을 드래그앤드롭하거나 클립보드(Ctrl+V)로 간편하게 로드합니다.
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
              원클릭 복사는 물론, 프롬프트를 직접 수정하여 명령어를 재조합하고 JSON/Markdown 파일로 즉시 내보냅니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 최상위 보안 원칙 (BYOK Standard) 연동 가이드 */}
      <section id="key" className="card">
        <h2>② Gemini API 키 등록 (BYOK 원칙)</h2>
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
              키는 브라우저 보안 저장소에 암호화 보관되며, 언제든 등록·교체·삭제할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="actions" style={{ marginTop: "16px" }}>
          <a href="/settings" className="button primary">
            <KeyRound size={15} /> 🔑 본인 Gemini 키 등록하러 가기
          </a>
          {GEMINI_GUIDE_URL && <GuideLinkButton url={GEMINI_GUIDE_URL} label="Google Gemini API 키 발급 상세 가이드 (새 창)" />}
        </div>
      </section>

      {/* 5. 10대 지원 생성 AI 도구별 특성 */}
      <section id="tools" className="card">
        <h2>③ 10대 지원 생성 AI 도구별 프롬프트 특성</h2>
        <p className="gd-lead">
          각 생성 AI 모델마다 가장 잘 반응하는 문장 구조와 문법이 다릅니다. 리버스 프롬프트는 선택한 타겟 도구에 최적화된 형식으로 프롬프트를 변환합니다.
        </p>

        <div className="gd-cards">
          <article>
            <h3>Midjourney (v6 / Niji)</h3>
            <p>서술형 묘사와 함께 <code>--ar</code>, <code>--stylize</code>, <code>--v 6.0</code> 등 정밀 명령어 파라미터를 결합하여 조립합니다.</p>
          </article>
          <article>
            <h3>DALL·E 3</h3>
            <p>단어 나열보다는 배경, 피사체, 조명, 디테일을 자연스러운 영어 문장으로 상세히 서술하는 문장형 프롬프트에 최적화됩니다.</p>
          </article>
          <article>
            <h3>Flux.1 / Stable Diffusion</h3>
            <p>품질 태그, 스타일 태그, 조명 및 렌더링 엔진 키워드가 쉼표(comma)로 구분되는 정밀 태그형 프롬프트로 변환합니다.</p>
          </article>
          <article>
            <h3>Sora / Google Veo 2</h3>
            <p>시점 변화, 카메라 무빙(팬, 틸트, 돌리), 피사체의 연속적인 동작 흐름과 프레임 속도를 시간순으로 묘사합니다.</p>
          </article>
          <article>
            <h3>Runway Gen-3 / Kling</h3>
            <p>샷 유형(클로즈업, 와이드샷), 렌즈 특성, 조명 무드 및 역동적인 물리 법칙을 강조한 시네마틱 프롬프트를 편성합니다.</p>
          </article>
          <article>
            <h3>Suno v3.5 / Udio v1.5</h3>
            <p>음악의 주 장르, 세부 서브장르, BPM, 악기 레이어(리드, 베이스, 드럼), 보컬 스타일 메타태그를 정확히 추출합니다.</p>
          </article>
        </div>
      </section>

      {/* 6. 옵션 설명 */}
      <section id="options" className="card">
        <h2>④ 분석 옵션 및 프롬프트 길이 가이드</h2>
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
            <b>추가 지시 (메모)</b>
            <span>"인물의 의상에 집중", "배경과 건축 구조 위주", "조명 톤만 차용" 등 회원님이 강조하고 싶은 부분을 직접 지시할 수 있습니다.</span>
          </div>
        </div>
      </section>

      {/* 7. 파일 규격 및 개인정보 원칙 */}
      <section id="limits" className="card">
        <h2>⑤ 파일 규격 및 데이터 격리 원칙</h2>
        <ul className="gd-list">
          <li><b>지원 파일 규격</b>: 이미지(JPG, PNG, WEBP, HEIC) 최대 {SIZE_LIMIT.image / MB}MB, 동영상(MP4, MOV, WEBM) 최대 {SIZE_LIMIT.video / MB}MB, 오디오(MP3, WAV, AAC, FLAC) 최대 {SIZE_LIMIT.audio / MB}MB.</li>
          <li><b>1시간 내 자동 파기</b>: 회원이 업로드한 원본 미디어 파일은 비공개 임시 버킷에만 저장되며 <b>1시간 내 완전히 자동 삭제</b>됩니다.</li>
          <li><b>데이터 영구 격리</b>: 회원 간 생성 데이터나 프롬프트 기록은 상호 공유되지 않으며 본인 계정에만 귀속됩니다.</li>
        </ul>
      </section>

      {/* 8. 자주 묻는 질문 (FAQ) */}
      <section id="faq" className="card">
        <h2>⑥ 자주 묻는 질문 (FAQ)</h2>
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
            <p>동영상과 오디오는 대용량 미디어이므로 멀티모달 프레임 파싱 및 타임코드 인덱싱에 보통 1~3분 정도 소요될 수 있습니다. 창을 닫지 않고 잠시만 대기해 주시면 분석이 완료됩니다.</p>
          </details>
          <details>
            <summary>Q. 분석 후 프롬프트를 일부 수정하고 싶습니다.</summary>
            <p>결과 화면의 텍스트 영역에서 프롬프트나 부정 프롬프트를 원하는 대로 수정한 뒤, [수정 저장·명령어 재조합] 버튼을 누르면 Midjourney 전체 명령어와 파라미터가 실시간으로 재조립됩니다.</p>
          </details>
          <details>
            <summary>Q. 분석 기록은 어디서 확인하나요?</summary>
            <p>모든 분석 결과는 [내 분석 기록] 메뉴에 최대 100건까지 자동 저장됩니다. 언제든 다시 열어보거나 JSON, Markdown 요약본으로 내보낼 수 있습니다.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
