"use client";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileUp, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/files/download";
import type { Cell } from "@/lib/files/table";

/** 파일 끌어다 놓기 + 선택 */
export function FileDrop({ accept, multiple, hint, onFiles }: { accept: string; multiple: boolean; hint: string; onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`fm-drop${over ? " over" : ""}`} role="button" tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); }}
    >
      <FileUp size={28} />
      <b>파일을 끌어다 놓거나 눌러서 고르세요</b>
      <small className="muted">{hint}</small>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { if (e.target.files?.length) onFiles([...e.target.files]); e.target.value = ""; }} />
    </div>
  );
}

/** 순서를 바꿀 수 있는 파일 목록 */
export function FileList<T extends { id: string; file: File }>({ items, onChange, render }: { items: T[]; onChange: (next: T[]) => void; render?: (it: T) => React.ReactNode }) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <ol className="fm-files">
      {items.map((it, i) => (
        <li key={it.id}>
          <div className="fm-file-head">
            <span className="fm-file-no">{i + 1}</span>
            <span className="fm-file-name" title={it.file.name}>{it.file.name}</span>
            <small className="muted">{formatBytes(it.file.size)}</small>
            <div className="fm-file-btns">
              <button type="button" aria-label={`${it.file.name} 위로`} onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
              <button type="button" aria-label={`${it.file.name} 아래로`} onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown size={14} /></button>
              <button type="button" aria-label={`${it.file.name} 빼기`} onClick={() => onChange(items.filter((x) => x.id !== it.id))}><Trash2 size={14} /></button>
            </div>
          </div>
          {render?.(it)}
        </li>
      ))}
    </ol>
  );
}

const show = (v: Cell) => (v === null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

/** 결과 미리보기 표(앞 limit행) */
export function PreviewTable({ header, rows, limit = 20, total }: { header: string[]; rows: Cell[][]; limit?: number; total?: number }) {
  const all = total ?? rows.length;
  return (
    <div className="fm-table-wrap">
      <table className="fm-table">
        <thead><tr><th>#</th>{header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, limit).map((r, i) => (
            <tr key={i}><td>{i + 1}</td>{header.map((_, c) => <td key={c}>{show(r[c] ?? null)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {all > limit && <small className="muted">앞 {limit}행만 보여 줍니다(전체 {all.toLocaleString()}행).</small>}
    </div>
  );
}

/** 저장 파일 이름 입력(확장자 고정 표시) */
export function NameInput({ value, onChange, ext, label = "저장할 이름" }: { value: string; onChange: (v: string) => void; ext: string; label?: string }) {
  return (
    <label>{label}
      <span className="fm-name"><input value={value} maxLength={80} onChange={(e) => onChange(e.target.value)} /><b>{ext}</b></span>
    </label>
  );
}

export function Messages({ error, notice }: { error: string; notice: string }) {
  return <>{error && <p role="alert" className="notice fm-error">{error}</p>}{notice && <p role="status" className="notice fm-ok">{notice}</p>}</>;
}

export const newId = () => Math.random().toString(36).slice(2, 10);
