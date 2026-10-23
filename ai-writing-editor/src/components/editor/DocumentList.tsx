"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { FORMATS } from "@/lib/we/types";
import type { DocumentSummary } from "@/lib/documents";

const label = (id: string) => FORMATS.find((f) => f.id === id)?.label ?? "자유 형식";

/** 내 문서 목록(최근 수정순). limit이 있으면 홈에서 최근 몇 개만 보여 준다. */
export function DocumentList({ limit }: { limit?: number }) {
  const [list, setList] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setList(data.documents ?? []);
      else setError(data.error ?? "문서를 불러오지 못했습니다.");
    } catch {
      setError("서버에 연결하지 못했습니다.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function remove(d: DocumentSummary) {
    if (!window.confirm(`"${d.title}" 문서를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/documents?id=${d.id}`, { method: "DELETE" });
    if (res.ok) setList((cur) => cur?.filter((x) => x.id !== d.id) ?? cur);
    else setError("삭제하지 못했습니다.");
  }

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!list) return <p className="muted">불러오는 중…</p>;
  const shown = limit ? list.slice(0, limit) : list;
  if (shown.length === 0) return <p className="we-empty">아직 만든 문서가 없습니다. 위에서 첫 글을 시작해 보세요.</p>;
  return (
    <ul className="we-docs">
      {shown.map((d) => (
        <li key={d.id}>
          <a href={`/editor/${d.id}`} className="we-doc-main">
            <strong>{d.title || "제목 없는 글"}</strong>
            <span className="we-badge">{label(d.format)}</span>
            <small>{d.chars.toLocaleString("ko-KR")}자 · {new Date(d.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</small>
          </a>
          <button type="button" aria-label={`${d.title} 삭제`} onClick={() => remove(d)}><Trash2 size={14} /></button>
        </li>
      ))}
    </ul>
  );
}
