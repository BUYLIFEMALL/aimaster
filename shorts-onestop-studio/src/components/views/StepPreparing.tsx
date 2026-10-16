import { Clock } from "lucide-react";

/** 아직 열리지 않은 작업 단계 안내(단계별로 순차 공개) */
export function StepPreparing({ eyebrow, title, intro, items }: { eyebrow: string; title: string; intro: string; items: string[] }) {
  return (
    <>
      <div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>
      <section className="card stack">
        <div className="notice warning"><strong><Clock size={14} style={{ verticalAlign: "-2px" }} /> 준비 중인 단계입니다</strong><p>이 화면은 순서대로 열리고 있습니다. 먼저 [API키등록·플랫폼연동]에서 본인 AI 키를 등록해 두시면, 단계가 열리는 즉시 바로 사용할 수 있습니다.</p></div>
        <h2>이 단계에서 할 수 있게 될 일</h2>
        <ul className="stack" style={{ gap: 6, margin: 0, paddingLeft: 18 }}>{items.map((t) => <li key={t}>{t}</li>)}</ul>
        <div className="actions"><a className="button primary" href="/settings">API키등록·플랫폼연동으로 이동</a></div>
      </section>
    </>
  );
}
