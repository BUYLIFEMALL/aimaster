// 2026-11-01 블로그 정리: 사용법(/guide) 맨 위 「✨ 새로 생긴 기능」 카드(에이전트·SEO·키워드·티스토리·BLOG 공통 사본, 내용은 각 페이지가 넘김).
// 프로그램마다 CSS 체계가 달라 인라인 스타일만 쓰고, 색은 각 프로그램의 --brand가 있으면 따른다.
export type GuideHighlight = { icon: string; title: string; desc: string; where: string };

export function GuideHighlights({ title = "✨ 새로 생긴 기능", items, tip, warn }: { title?: string; items: GuideHighlight[]; tip?: string; warn?: string }) {
  return (
    <section aria-label={title} style={{ margin: "0 0 28px", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px", color: "#0f172a" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {items.map((item) => (
          <div key={item.title} style={{ border: "1px solid #e2e8f0", borderTop: "3px solid var(--brand, #059669)", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{item.icon} {item.title}</div>
            <p style={{ margin: "6px 0 8px", fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{item.desc}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>📍 {item.where}</p>
          </div>
        ))}
      </div>
      {tip && <p style={{ margin: "14px 0 0", padding: "10px 12px", borderRadius: 10, background: "#ecfdf5", color: "#065f46", fontSize: 13 }}>💡 {tip}</p>}
      {warn && <p style={{ margin: "8px 0 0", padding: "10px 12px", borderRadius: 10, background: "#fffbeb", color: "#92400e", fontSize: 13 }}>⚠️ {warn}</p>}
    </section>
  );
}
