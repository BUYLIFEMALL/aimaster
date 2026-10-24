"use client";
// U8-B: 업무 워크스페이스에서 보낸 할 일(공용 받은편지함, 받는 곳 ai-task-planner) — 있을 때만 보인다.
import type { ReceivedRow } from "@/lib/planner/received";

const SOURCE: Record<string, string> = { "ai-work-workspace": "업무 워크스페이스" };

export function ReceivedTasks({ items, busy, add, discard }: { items: ReceivedRow[]; busy: boolean; add: (id: string) => void; discard: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="card received-tasks" aria-label="받은 할 일">
      <div className="section-header">
        <h2>📥 받은 할 일 <small>{items.length}개</small></h2>
        <span className="muted received-hint">업무 워크스페이스에서 보낸 할 일입니다. 「할 일로 추가」를 누르면 목록에 들어갑니다.</span>
      </div>
      <ul className="received-list">
        {items.map(item => {
          const due = typeof item.data?.["예정일"] === "string" ? item.data["예정일"] : null;
          const priority = typeof item.data?.["우선순위"] === "string" ? item.data["우선순위"] : null;
          return (
            <li key={item.id} className="received-item">
              <div className="received-text">
                <strong>{item.title}</strong>
                <small>{SOURCE[item.source_slug] ?? item.source_slug}{due ? ` · 예정일 ${due}` : ""}{priority ? ` · 우선순위 ${priority}` : ""}</small>
              </div>
              <div className="received-actions">
                <button className="primary received-add" disabled={busy} onClick={() => add(item.id)}>➕ 할 일로 추가</button>
                <button className="received-discard" disabled={busy} onClick={() => discard(item.id)}>버리기</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
