"use client";
import { useMemo, useState } from "react";
import { FolderOpen, Loader2, X } from "lucide-react";

// 「📁 내 템플릿 불러오기」(2026-10-21 v1.12) — AI Prompt 자동화 보관함의 템플릿을 골라 {{변수}}를 채운 뒤 요청 칸에 넣는다.
// 변수 채우기는 AI 호출 없이 화면에서만 바꾼다(비용 없음).
interface Template { id: string; title: string; description: string; content: string; category: string }

const AI_PROMPT_URL = "https://ai-prompt.buylife.xyz";
const varsOf = (text: string) => Array.from(new Set(Array.from(text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g), (m) => m[1])));
const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (all, name: string) => values[name]?.trim() || all);

export function TemplatePicker({ onInsert, maxLength }: { onInsert: (text: string) => void; maxLength: number }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  async function openPicker() {
    setOpen(true);
    if (templates) return;
    setError("");
    try {
      const res = await fetch("/api/prompt-templates", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "내 템플릿을 불러오지 못했습니다.");
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "내 템플릿을 불러오지 못했습니다.");
    }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (templates ?? []).filter((t) => !q || `${t.title} ${t.description} ${t.category}`.toLowerCase().includes(q));
  }, [templates, query]);
  const vars = picked ? varsOf(picked.content) : [];
  const result = picked ? fill(picked.content, values) : "";

  function close() {
    setOpen(false);
    setPicked(null);
    setValues({});
  }

  if (!open) {
    return (
      <button type="button" onClick={openPicker} style={{ alignSelf: "flex-start" }}>
        <FolderOpen size={14} />📁 내 템플릿 불러오기
      </button>
    );
  }

  return (
    <div className="card stack" style={{ padding: 14, borderColor: "#c4b5fd", background: "#faf5ff" }} aria-label="내 템플릿 불러오기">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 13 }}>📁 내 템플릿 {picked ? `— ${picked.title}` : "불러오기"}</strong>
        <button type="button" aria-label="닫기" onClick={close} style={{ padding: 4 }}><X size={14} /></button>
      </div>

      {error && <p role="alert" className="lp-alert"><span>{error}</span></p>}
      {!error && templates === null && <p className="muted"><Loader2 size={13} className="we-spin" /> 불러오는 중…</p>}

      {templates && templates.length === 0 && (
        <p className="muted" style={{ fontSize: 12 }}>
          아직 저장한 템플릿이 없습니다. <a href={AI_PROMPT_URL} target="_blank" rel="noreferrer">AI Prompt 자동화</a>의 「📁 내 템플릿 보관함」에서 만들면 이곳에서 바로 불러올 수 있습니다.
        </p>
      )}

      {templates && templates.length > 0 && !picked && (
        <>
          <input aria-label="템플릿 검색" placeholder="제목·설명·카테고리로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 240, overflowY: "auto", display: "grid", gap: 6 }}>
            {shown.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => { setPicked(t); setValues({}); }}
                  style={{ width: "100%", textAlign: "left", display: "block", background: "#fff" }}
                >
                  <span style={{ fontWeight: 700 }}>{t.title}</span>
                  <span className="muted" style={{ display: "block", fontSize: 11 }}>
                    {t.category}{varsOf(t.content).length ? ` · 변수 ${varsOf(t.content).length}개` : ""}{t.description ? ` · ${t.description}` : ""}
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="muted" style={{ fontSize: 12 }}>찾는 템플릿이 없습니다.</li>}
          </ul>
          <p className="muted" style={{ fontSize: 11 }}>
            템플릿은 <a href={AI_PROMPT_URL} target="_blank" rel="noreferrer">AI Prompt 자동화</a>에서 만들고 고칩니다.
          </p>
        </>
      )}

      {picked && (
        <>
          {vars.length > 0 ? (
            <div className="stack" style={{ gap: 8 }}>
              {vars.map((v) => (
                <label key={v} style={{ fontSize: 12 }}>{`{{${v}}}`}
                  <input value={values[v] ?? ""} placeholder={`${v} 값을 입력하세요`} onChange={(e) => setValues((cur) => ({ ...cur, [v]: e.target.value }))} />
                </label>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>이 템플릿에는 바꿀 변수가 없습니다. 그대로 넣습니다.</p>
          )}
          {result.length > maxLength && (
            <p className="muted" style={{ fontSize: 12 }}>템플릿이 길어 앞 {maxLength.toLocaleString("ko-KR")}자까지만 넣습니다.</p>
          )}
          <div className="actions">
            <button type="button" onClick={() => setPicked(null)}>목록으로</button>
            <button type="button" className="primary" onClick={() => { onInsert(result.slice(0, maxLength)); close(); }}>
              요청 칸에 넣기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
