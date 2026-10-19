"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, MessageSquare, Trash2, UploadCloud } from "lucide-react";
import { BTN_PRIMARY, Card, ErrorNote } from "@/components/studio/ui";
import { UPLOAD_STAGE_LABELS } from "@/lib/chat/core";

interface Doc {
  id: string;
  name: string;
  size_bytes: number;
  chunk_count: number;
  created_at: string;
}

const ACCEPT = ".txt,.md,.markdown,.csv,.pdf,.docx,.pptx,.xlsx,.hwp,.hwpx,.png,.jpg,.jpeg";

function sizeLabel(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
}
function daysLeft(iso: string) {
  const left = 30 - Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return Math.max(0, left);
}

type UploadResult = { chunkCount: number } | { error: string; needKey?: boolean };

/** 업로드 응답을 읽는다 — 진행 단계(한 줄 JSON)를 받으면 onStage로 알리고, 오류(JSON)는 그대로 돌려준다 */
async function readProgress(res: Response, onStage: (label: string) => void): Promise<UploadResult> {
  if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("ndjson")) {
    const d = await res.json().catch(() => ({}));
    return res.ok ? { chunkCount: d.document?.chunk_count ?? 0 } : { error: d.error ?? "올리지 못했습니다.", needKey: d.needApiKey };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: UploadResult = { error: "응답이 중간에 끊겼습니다. 목록을 확인한 뒤 다시 시도해 주세요." };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line) as { type: string; stage?: string; error?: string; document?: { chunk_count?: number } };
      if (ev.type === "stage" && ev.stage) onStage(UPLOAD_STAGE_LABELS[ev.stage] ?? "처리하는 중…");
      else if (ev.type === "done") result = { chunkCount: ev.document?.chunk_count ?? 0 };
      else if (ev.type === "error") result = { error: ev.error ?? "올리지 못했습니다." };
    }
  }
  return result;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [maxDocs, setMaxDocs] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; needKey?: boolean } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/documents", { cache: "no-store" }).then((x) => x.json()).catch(() => ({}));
    if (d.documents) setDocs(d.documents);
    if (d.maxDocs) setMaxDocs(d.maxDocs);
    if (d.error) setError({ text: d.error });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setDone(null);
    for (const f of Array.from(files)) {
      if (f.size > 4 * 1024 * 1024) {
        setError({ text: `「${f.name}」은 4MB를 넘습니다. 나눠서 올려 주세요.` });
        continue;
      }
      setBusy(`「${f.name}」 올리는 중…`);
      const form = new FormData();
      form.append("file", f);
      const started = Date.now();
      const res = await fetch("/api/documents", { method: "POST", body: form, headers: { "x-progress": "1" } }).catch(() => null);
      const result = res ? await readProgress(res, (label) => setBusy(`「${f.name}」 ${label} (${Math.round((Date.now() - started) / 1000)}초)`)) : { error: "연결이 끊겼습니다. 다시 시도해 주세요." };
      if ("error" in result) {
        setError({ text: `「${f.name}」: ${result.error}`, needKey: result.needKey });
      } else {
        setDone(`「${f.name}」을 ${result.chunkCount}개 조각으로 저장했습니다(${Math.round((Date.now() - started) / 1000)}초). 이제 채팅에서 이 문서를 근거로 답합니다.`);
      }
      await load();
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remove(id: string, name: string) {
    if (!confirm(`「${name}」을 삭제할까요? 이 문서로 답하지 않게 됩니다.`)) return;
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">📄 내 문서</h1>
        <p className="mt-1 text-sm text-slate-400">문서를 올리면 내용을 잘게 나눠 임베딩해 두고, 채팅에서 질문과 관련된 부분을 찾아 근거로 답합니다(RAG). 원본 파일은 보관하지 않고, 뽑은 글과 임베딩만 회원님 계정에 저장됩니다.</p>
      </div>

      <Card>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2d3448] px-4 py-10 text-center hover:border-indigo-500/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) void upload(e.dataTransfer.files);
          }}
        >
          <UploadCloud className="h-9 w-9 text-indigo-300" />
          <span className="text-sm font-bold text-slate-200">파일을 끌어다 놓거나 눌러서 선택</span>
          <span className="text-xs text-slate-500">TXT·MD·CSV·PDF·DOCX·PPTX·XLSX·HWP·이미지 · 파일당 4MB · 최대 {maxDocs}개</span>
          <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" disabled={!!busy} onChange={(e) => void upload(e.target.files)} />
          <span className={`${BTN_PRIMARY} mt-2 pointer-events-none`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} 문서 올리기</span>
        </label>
        {busy && <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />{busy}</p>}
        {error && <div className="mt-3"><ErrorNote message={error.text} needKey={error.needKey} /></div>}
        {done && <p role="status" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{done}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-slate-200">올린 문서 {docs.length}개</h2>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-500">아직 올린 문서가 없습니다. 회사 소개서·매뉴얼·강의 자료처럼 자주 묻는 내용이 담긴 문서를 올려 보세요.</p>
        ) : (
          <ul className="divide-y divide-[#262c3d]">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <FileText className="h-5 w-5 shrink-0 text-emerald-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-200">{d.name}</p>
                  <p className="text-[11px] text-slate-500">{sizeLabel(d.size_bytes)} · 조각 {d.chunk_count}개 · {daysLeft(d.created_at)}일 뒤 자동 삭제</p>
                </div>
                <Link href={`/chat?doc=${d.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/20">
                  <MessageSquare className="h-3.5 w-3.5" /> 이 문서로 질문
                </Link>
                <button type="button" aria-label={`${d.name} 삭제`} onClick={() => void remove(d.id, d.name)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
