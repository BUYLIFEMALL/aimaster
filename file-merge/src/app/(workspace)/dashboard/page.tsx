import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TOOLS = [
  { href: "/excel-merge", ic: "📊", step: "STEP 1", title: "엑셀 합치기", desc: "여러 엑셀·CSV를 머리글 기준으로 한 표에, 또는 시트를 한 파일로" },
  { href: "/excel-split", ic: "✂️", step: "STEP 2", title: "엑셀 나누기", desc: "시트별 · 열 값별 · N행씩 나눠 ZIP으로" },
  { href: "/text-merge", ic: "📝", step: "STEP 3", title: "텍스트 합치기", desc: "여러 TXT를 순서·구분자·파일명 머리말로 하나로" },
  { href: "/text-split", ic: "🧩", step: "STEP 4", title: "텍스트 나누기", desc: "글자 수 · 조각 수 · 문장 수 기준으로 나눠 ZIP으로" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHero
        badge="🏠 대시보드"
        title="엑셀·텍스트 파일, 합치고 나누기를 한 곳에서"
        description="여러 파일을 머리글 기준으로 한 표에 모으거나, 큰 파일을 시트·값·행 수·글자 수로 나눕니다. 원본 서식(글꼴·색·테두리·표시 형식)도 그대로 옮길 수 있어요."
        tip="파일은 서버로 보내지 않고 지금 쓰는 브라우저 안에서만 처리합니다. 창을 닫으면 작업 내용이 남지 않아요."
      >
        <a className="button primary" href="/excel-merge">📊 엑셀 합치기 시작</a>
        <a className="button" href="/guide">📖 사용 매뉴얼</a>
      </PageHero>

      <div className="mx-kpi-grid" aria-label="이 도구의 특징">
        <div className="mx-kpi">
          <small>🔒 처리 위치</small>
          <strong>내 브라우저</strong>
          <span>서버 전송·저장 없음</span>
        </div>
        <div className="mx-kpi green">
          <small>🔑 필요한 키</small>
          <strong>없음</strong>
          <span>API 키·외부 계정 연동 불필요</span>
        </div>
        <div className="mx-kpi amber">
          <small>📁 지원 형식</small>
          <strong>xlsx · xls · xlsm · csv · txt</strong>
          <span>결과는 xlsx·csv·txt·zip</span>
        </div>
        <div className="mx-kpi muted">
          <small>🎨 서식 유지</small>
          <strong>100만 칸까지</strong>
          <span>.xlsx·.xlsm 원본 서식 그대로(예: 10만 행 × 10열)</span>
        </div>
      </div>

      <section className="card" aria-label="도구 고르기">
        <h2 style={{ marginBottom: 12 }}>🧭 어떤 작업을 할까요?</h2>
        <div className="mx-tools">
          {TOOLS.map((t) => (
            <a key={t.href} href={t.href}>
              <span className="mx-step">{t.step}</span>
              <span className="mx-tool-ic" aria-hidden="true">{t.ic}</span>
              <strong>{t.title}</strong>
              <small className="muted">{t.desc}</small>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
