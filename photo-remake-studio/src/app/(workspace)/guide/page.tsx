export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow" style={{ color: "var(--brand)" }}>PHOTO REMAKE LAB EDITORIAL GUIDE</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>🪄 AI 포토 리메이크 연동 & 사용 매뉴얼</span>
          <span style={{ fontSize: 13, padding: "3px 9px", borderRadius: 999, background: "rgba(245,158,11,0.18)", color: "var(--brand)", fontWeight: 700, border: "1px solid rgba(245,158,11,0.3)" }}>v1.09 옵시디언 에디션</span>
        </h1>
        <p>손상된 옛날 사진 복원, 흑백 컬러화, AI 초해상도 확대부터 정교한 사물 합성까지 한눈에 마스터하는 공식 가이드북입니다.</p>
      </div>

      <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(16,185,129,0.08) 100%)", borderColor: "rgba(245,158,11,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, color: "var(--brand)", marginBottom: 4 }}>✨ AI 포토 리메이크 3-Step 파이프라인</h3>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Before/After 실시간 비교 슬라이더로 복원 전후 디테일을 직관적으로 확인하세요.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--brand)" }}>#오래된흑백복원</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--ok)" }}>#스크래치제거</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "#38bdf8" }}>#얼굴선명화</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "#ec4899" }}>#사물자연합성</span>
          </div>
        </div>
      </div>

      <div className="stack guide">
        <section className="card">
          <h2 style={{ fontSize: 17, color: "var(--brand)", marginBottom: 8 }}>1. Gemini API 키 등록 (최초 1회)</h2>
          <p>
            [API키등록·플랫폼연동] 메뉴에서 회원님 본인의 Google Gemini API 키를 등록합니다. 키가 없으면 AI 복원 작업을 진행할 수 없습니다. 등록된 키는 안전하게 보관되며 다른 회원이나 운영자와 절대 공유되지 않습니다.
          </p>
          <div style={{ marginTop: 14 }}>
            <a className="button primary" href="/settings">API 키 등록 화면으로 이동</a>
          </div>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 17, color: "var(--foreground)", marginBottom: 8 }}>2. 오래된 사진 복원 및 컬러화</h2>
          <p>
            JPEG, PNG, WebP 사진을 올리고 [손상 복원] 및 [흑백 컬러화] 옵션을 선택합니다. AI가 인물의 얼굴 윤곽, 표정, 고유의 구도를 엄격히 보존하면서 손상된 스크래치와 노이즈를 매끄럽게 복원합니다.
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            💡 <b>초해상도 확대(Upscale)</b>: AI가 생성한 결과물의 픽셀을 2배/4배로 선명하게 키우며, 긴 변 기준 최대 8,192px까지 확대할 수 있습니다.
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 17, color: "var(--foreground)", marginBottom: 8 }}>3. 정교한 사물 합성 (Compose)</h2>
          <p>
            기본 사진 1장에 추가하고 싶은 사물 사진을 최대 5장까지 등록할 수 있습니다. 각 사물마다 착용 위치(예: "머리에 쓴 모자", "손에 든 찻잔")를 지정하고, 배경 유지 또는 연출 전환을 선택하여 자연스러운 합성을 완성합니다.
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 17, color: "var(--foreground)", marginBottom: 8 }}>4. Before / After 실시간 비교 및 보관함</h2>
          <p>
            작업 완료 후 중앙 슬라이더 바를 좌우로 움직여 복원 전(Before)과 복원 후(After)의 디테일 차이를 실시간으로 비교할 수 있습니다. 완성된 사진은 고화질 PNG 또는 JPEG로 내려받을 수 있으며, [내 보관함에 저장]을 통해 브라우저 로컬에 최대 20개까지 안전하게 보관됩니다.
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 17, color: "var(--brand)", marginBottom: 8 }}>5. 자주 묻는 질문 (FAQ)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <details style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--foreground)" }}>사진이 서버에 저장되거나 유출되지 않나요?</summary>
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>서버에 사진을 영구 보관하지 않습니다. AI 처리를 위해 회원 본인의 Google Gemini API로 암호화 전송될 뿐이며, 보관함 데이터는 사용자의 브라우저 IndexedDB에만 저장됩니다.</p>
            </details>
            <details style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--foreground)" }}>흑백 사진의 원래 색상을 정확히 맞추나요?</summary>
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>Gemini AI가 시대적 맥락(의복, 배경, 조명)을 추론하여 가장 자연스러운 컬러로 채색합니다. 원하는 색조가 있다면 [추가 요청]에 "따뜻한 웜톤", "연한 파스텔톤 한복"처럼 입력하시면 반영됩니다.</p>
            </details>
            <details style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--foreground)" }}>해상도 확대 시 얼굴이 왜곡되지 않나요?</summary>
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>얼굴 형태 보존 프롬프트가 기본 적용되어 얼굴 특징을 유지하며 확대됩니다. 원본 사진의 해상도가 지나치게 낮거나 흐릿한 경우 약간의 질감 차이가 있을 수 있으므로 비교 슬라이더로 확인 후 저장하세요.</p>
            </details>
            <details style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--foreground)" }}>사물 합성 시 테두리가 어색하면 어떻게 하나요?</summary>
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>사물 사진 업로드 시 배경이 투명한 PNG이거나 흰색 단색 배경의 이미지를 사용할 때 가장 자연스럽게 합성됩니다. 위치 지시 문구를 구체적으로 적어주시면 더욱 정교해집니다.</p>
            </details>
            <details style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--foreground)" }}>호출 비용은 어떻게 계산되나요?</summary>
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>회원님 본인의 Google Gemini API 계정 사용량으로 계산됩니다. 복원 1회당 이미지 생성 1회 호출이 발생하며, 연결 확인 및 지시 제안은 저렴한 텍스트 모델로 처리됩니다.</p>
            </details>
            <details style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--foreground)" }}>모바일 브라우저에서도 사용 가능한가요?</summary>
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>네, 375px 모바일 뷰포트에서도 슬라이더 터치 비교 및 상단 슬림 메뉴를 통해 데스크톱과 동일하게 완벽 지원됩니다.</p>
            </details>
          </div>
        </section>
      </div>
    </>
  );
}
