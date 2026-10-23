"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { type Scope, collectDocuments, pathOf } from "@/lib/export/collect";
import { FORMAT_LABELS, type Format, type Mode, type ExportResult, runExport } from "@/lib/export/run";
import { DEFAULT_PAGE_OPTIONS, FONT_SIZES, MARGIN_LABELS, type PageOptions } from "@/lib/export/options";
import { downloadBlob, formatBytes } from "@/lib/download";
import { sanitizedMarkdown } from "./MarkdownPreview";
import { useWorkspace } from "./WorkspaceProvider";

function parseScope(value: string): Scope {
  if (value === "all") return { type: "all" };
  return value.startsWith("f:") ? { type: "folder", id: value.slice(2) } : { type: "document", id: value.slice(2) };
}

/** 문서·폴더·전체를 HTML / PDF / Word / 마크다운(.md)으로 내보내기 (여러 문서는 한 문서로 합치기 또는 ZIP) */
export function ExportPanel() {
  const store = useWorkspace();
  const live = store.nodes.filter(n => !n.deletedAt);
  const [scopeValue, setScopeValue] = useState("");
  const [format, setFormat] = useState<Format>("pdf");
  const [mode, setMode] = useState<Mode>("merge");
  const [options, setOptions] = useState<PageOptions>({ ...DEFAULT_PAGE_OPTIONS });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(Omit<ExportResult, "blob"> & { size: number }) | null>(null);
  const [error, setError] = useState("");

  const effectiveScope = scopeValue || (store.draft ? `d:${store.draft.id}` : "all");
  const docs = useMemo(() => collectDocuments(store.nodes, parseScope(effectiveScope)), [store.nodes, effectiveScope]);
  const folders = live.filter(n => n.kind === "folder");
  const documents = live.filter(n => n.kind === "document");
  const multi = docs.length > 1;
  const paged = format === "pdf" || format === "docx";
  const set = <K extends keyof PageOptions>(k: K, v: PageOptions[K]) => setOptions(o => ({ ...o, [k]: v }));

  async function exportNow() {
    setBusy(true); setError(""); setResult(null);
    try {
      await store.save();
      const nodes = await store.run(repo => repo.list());
      const fresh = collectDocuments(nodes, parseScope(effectiveScope));
      const scopeName = effectiveScope === "all" ? "전체 문서" : nodes.find(n => n.id === effectiveScope.slice(2))?.name ?? "문서 모음";
      const out = await runExport({ docs: fresh, format, mode, options, title: scopeName, sanitize: sanitizedMarkdown });
      downloadBlob(out.filename, out.blob);
      const { blob, ...rest } = out;
      setResult({ ...rest, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내지 못했습니다. 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  return <div className="card stack">
    <h2>문서 내보내기</h2>
    <label>내보낼 대상<select aria-label="내보낼 대상" value={effectiveScope} onChange={e => setScopeValue(e.target.value)} disabled={busy}>
      <option value="all">전체 문서 ({documents.length}개)</option>
      {folders.length ? <optgroup label="폴더 (하위 폴더 포함)">{folders.map(f => <option key={f.id} value={`f:${f.id}`}>{pathOf(live, f)}</option>)}</optgroup> : null}
      {documents.length ? <optgroup label="문서">{documents.map(d => <option key={d.id} value={`d:${d.id}`}>{pathOf(live, d)}</option>)}</optgroup> : null}
    </select></label>
    <p className="muted" aria-live="polite">{docs.length ? `문서 ${docs.length}개를 내보냅니다.` : "내보낼 문서가 없습니다. 폴더에 문서를 먼저 만들어 주세요."}</p>

    <fieldset className="option-group"><legend>형식</legend>
      <div className="option-row">{(Object.keys(FORMAT_LABELS) as Format[]).map(f => <label key={f} className={`choice ${format === f ? "chosen" : ""}`}><input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} disabled={busy}/>{FORMAT_LABELS[f]}</label>)}</div>
    </fieldset>

    {multi ? <fieldset className="option-group"><legend>여러 문서를 내보내는 방식</legend>
      <div className="option-row">
        <label className={`choice ${mode === "merge" ? "chosen" : ""}`}><input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} disabled={busy}/>한 문서로 합치기 (파일 이름이 제목, 파일마다 새 쪽)</label>
        <label className={`choice ${mode === "zip" ? "chosen" : ""}`}><input type="radio" name="mode" checked={mode === "zip"} onChange={() => setMode("zip")} disabled={busy}/>문서별 파일을 ZIP으로 묶기 (폴더 구조 유지)</label>
      </div>
    </fieldset> : null}

    {paged ? <fieldset className="option-group"><legend>페이지 설정</legend>
      <div className="option-grid">
        <label>용지<select aria-label="용지" value={options.size} onChange={e => set("size", e.target.value as PageOptions["size"])} disabled={busy}><option value="A4">A4</option><option value="LETTER">Letter</option></select></label>
        <label>방향<select aria-label="방향" value={options.orientation} onChange={e => set("orientation", e.target.value as PageOptions["orientation"])} disabled={busy}><option value="portrait">세로</option><option value="landscape">가로</option></select></label>
        <label>여백<select aria-label="여백" value={options.margin} onChange={e => set("margin", e.target.value as PageOptions["margin"])} disabled={busy}>{(Object.keys(MARGIN_LABELS) as PageOptions["margin"][]).map(m => <option key={m} value={m}>{MARGIN_LABELS[m]}</option>)}</select></label>
        <label>글자 크기<select aria-label="글자 크기" value={options.fontSize} onChange={e => set("fontSize", Number(e.target.value))} disabled={busy}>{FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}</select></label>
      </div>
    </fieldset> : null}

    <div><button type="button" className="button download" disabled={busy || !docs.length} onClick={exportNow}><Download size={16}/>{busy ? "만드는 중…" : "내보내기"}</button></div>
    {busy && format === "pdf" ? <p className="muted" role="status">PDF를 만드는 중입니다. 처음 한 번은 한글 글꼴(약 12MB)을 내려받느라 시간이 걸릴 수 있습니다.</p> : null}
    {error ? <p className="error" role="alert">{error}</p> : null}
    {result ? <div className="notice" role="status" aria-label="내보내기 결과">
      <strong>{result.filename}</strong> 파일({formatBytes(result.size)})을 만들었습니다. 브라우저 내려받기 목록에서 저장 여부를 확인하세요. 변환 성공 {result.ok}개{result.failed.length ? `, 실패 ${result.failed.length}개` : ""}.
      {result.failed.length ? <ul>{result.failed.map(f => <li key={f.name}>{f.name}: {f.error}</li>)}</ul> : null}
    </div> : null}

    <div className="notice">
      <strong>변환 안내</strong>
      <ul>
        <li>PDF는 글자를 선택·검색할 수 있는 텍스트 PDF이며, 기울임꼴은 글꼴 제한으로 구분되지 않을 수 있습니다.</li>
        <li>Word(.docx)는 제목·목록·표가 실제 Word 요소로 만들어집니다. 한글 글꼴은 맑은 고딕을 지정하며, 없으면 Word가 대체 글꼴을 씁니다.</li>
        <li>이미지는 파일에 포함하지 않고 [이미지: 설명] 글자로 남깁니다. 원본 HTML 태그는 서식 없이 글자만 남깁니다.</li>
        <li>알파벳 목록(a. b. c.)은 이 프로그램 전용 표현이라 다른 마크다운 프로그램에서는 일반 문단으로 보일 수 있습니다.</li>
      </ul>
    </div>
  </div>;
}
