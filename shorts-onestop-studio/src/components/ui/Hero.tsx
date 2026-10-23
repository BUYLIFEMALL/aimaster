/** 화면 상단 히어로(표준 §2.2): 단계·목적·팁·소요 시간 + 대표 아이콘 */
export function Hero({ eyebrow, title, desc, emoji, meta = [], children }: { eyebrow: string; title: string; desc: string; emoji: string; meta?: string[]; children?: React.ReactNode }) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{desc}</p>
        {meta.length > 0 && <div className="hero-meta">{meta.map((m) => <span key={m}>{m}</span>)}</div>}
        {children && <div className="actions" style={{ marginTop: 14 }}>{children}</div>}
      </div>
      <div className="hero-icon" aria-hidden>{emoji}</div>
    </section>
  );
}
