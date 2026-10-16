import { Hero } from "@/components/ui/Hero";

/** 아직 열리지 않은 작업 단계 안내(단계별로 순차 공개) */
export function StepPreparing({ eyebrow, title, intro, emoji, items }: { eyebrow: string; title: string; intro: string; emoji: string; items: string[] }) {
  return (
    <>
      <Hero eyebrow={eyebrow} title={title} desc={intro} emoji={emoji} meta={["🚧 준비 중 · 순서대로 공개"]} />
      <section className="card stack">
        <div className="avatar-tip"><span className="avatar">🤖</span><div><strong>이 단계는 곧 열려요!</strong><p className="muted">먼저 [💡 주제·대본]에서 대본을 만들어 보관함에 저장해 두시면, 이 단계가 열리는 즉시 이어서 작업할 수 있습니다.</p></div></div>
        <h2>이 단계에서 할 수 있게 될 일</h2>
        <ul className="stack" style={{ gap: 6, margin: 0, paddingLeft: 18 }}>{items.map((t) => <li key={t}>{t}</li>)}</ul>
        <div className="actions"><a className="button primary" href="/topic">💡 주제·대본으로 이동</a></div>
      </section>
    </>
  );
}
