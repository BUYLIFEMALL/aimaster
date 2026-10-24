"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Pencil, MessageSquareWarning, Eye, FileText } from "lucide-react";
import Modal from "@/components/ui/Modal";
import GoldButton from "@/components/ui/GoldButton";
import MarkdownView from "./MarkdownView";
import type { DevRequest } from "./types";

const GITHUB_BLOB = "https://github.com/BUYLIFEMALL/aimaster/blob/master/";

export type Dialog =
  | { type: "view"; path: string }
  | { type: "edit"; path: string }
  | { type: "comment"; path: string }
  | { type: "role_note"; role: string; title: string }
  | { type: "markdown"; title: string; markdown: string; path?: string }
  | { type: "request"; id: string };

const KIND_LABEL: Record<string, string> = { doc_edit: "수정안", doc_comment: "관리자 지시", role_note: "역할 메모" };

export default function DocDialogs({
  dialog,
  setDialog,
  requests,
  onSaved,
}: {
  dialog: Dialog | null;
  setDialog: (d: Dialog | null) => void;
  requests: DevRequest[];
  onSaved: (r: DevRequest) => void;
}) {
  const close = () => setDialog(null);
  if (!dialog) return null;
  if (dialog.type === "view") return <ViewDialog path={dialog.path} setDialog={setDialog} requests={requests} onClose={close} />;
  if (dialog.type === "edit") return <EditDialog path={dialog.path} onClose={close} onSaved={onSaved} setDialog={setDialog} />;
  if (dialog.type === "comment") return <NoteDialog kind="doc_comment" target={dialog.path} title={dialog.path} onClose={close} onSaved={onSaved} />;
  if (dialog.type === "role_note") return <NoteDialog kind="role_note" target={dialog.role} title={dialog.title} onClose={close} onSaved={onSaved} />;
  if (dialog.type === "request") return <RequestDialog id={dialog.id} onClose={close} />;
  return (
    <Modal isOpen onClose={close} title={dialog.title} size="xl" className="max-w-5xl">
      <div className="p-6">
        {dialog.path && (
          <div className="mb-4 flex flex-wrap gap-2">
            <GoldButton size="sm" variant="outline" onClick={() => setDialog({ type: "view", path: dialog.path! })}><FileText size={14} className="mr-1" />원문 전체 보기</GoldButton>
            <GoldButton size="sm" variant="outline" onClick={() => setDialog({ type: "comment", path: dialog.path! })}><MessageSquareWarning size={14} className="mr-1" />관리자 지시 달기</GoldButton>
          </div>
        )}
        <MarkdownView markdown={dialog.markdown} path={dialog.path} onOpenDoc={(p) => setDialog({ type: "view", path: p })} />
      </div>
    </Modal>
  );
}

function useDoc(path: string, fresh = false) {
  const [state, setState] = useState<{ loading: boolean; error: string; content: string; size: number; editable: boolean }>({ loading: true, error: "", content: "", size: 0, editable: false });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fetch(`/api/admin/dev-docs/file?path=${encodeURIComponent(path)}${fresh ? "&fresh=1" : ""}`)
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => { if (alive) setState(ok ? { loading: false, error: "", content: j.content, size: j.size, editable: j.editable } : { loading: false, error: j.error ?? "읽기 실패", content: "", size: 0, editable: false }); })
      .catch(() => alive && setState({ loading: false, error: "네트워크 오류", content: "", size: 0, editable: false }));
    return () => { alive = false; };
  }, [path, fresh]);
  return state;
}

function ViewDialog({ path, setDialog, requests, onClose }: { path: string; setDialog: (d: Dialog | null) => void; requests: DevRequest[]; onClose: () => void }) {
  const doc = useDoc(path);
  const open = requests.filter((r) => r.target_path === path && r.status === "open");
  return (
    <Modal isOpen onClose={onClose} title={path} size="xl" className="max-w-5xl">
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {doc.editable && <GoldButton size="sm" onClick={() => setDialog({ type: "edit", path })}><Pencil size={14} className="mr-1" />직접 수정</GoldButton>}
          <GoldButton size="sm" variant="outline" onClick={() => setDialog({ type: "comment", path })}><MessageSquareWarning size={14} className="mr-1" />관리자 지시 달기</GoldButton>
          <a href={GITHUB_BLOB + path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-subtext hover:bg-white/5 hover:text-white">
            <ExternalLink size={13} />GitHub에서 보기
          </a>
          {!doc.loading && !doc.error && <span className="text-xs text-subtext">{Math.round(doc.size / 1024)}KB{!doc.editable && " · 크기가 커서 보기 전용"}</span>}
        </div>
        {open.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs">
            <p className="mb-2 font-bold text-amber-300">반영 대기 중 {open.length}건 — 담당 세션이 다음 작업 때 이 문서에 반영합니다</p>
            <ul className="space-y-1">
              {open.map((r) => (
                <li key={r.id} className="text-white/80">
                  <span className="mr-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-200">{KIND_LABEL[r.kind]}</span>
                  {r.kind === "doc_edit" ? (r.note || "(메모 없음)") : r.note}
                  <button className="ml-2 text-sky-300 underline" onClick={() => setDialog({ type: "request", id: r.id })}>자세히</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {doc.loading && <p className="text-subtext text-sm">불러오는 중…</p>}
        {doc.error && <p className="text-rose-300 text-sm">{doc.error}</p>}
        {!doc.loading && !doc.error && <MarkdownView markdown={doc.content} path={path} onOpenDoc={(p) => setDialog({ type: "view", path: p })} />}
      </div>
    </Modal>
  );
}

function EditDialog({ path, onClose, onSaved, setDialog }: { path: string; onClose: () => void; onSaved: (r: DevRequest) => void; setDialog: (d: Dialog | null) => void }) {
  const doc = useDoc(path, true);
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const value = text ?? doc.content;

  const save = async () => {
    setSaving(true); setError("");
    const r = await fetch("/api/admin/dev-docs/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "doc_edit", target_path: path, proposed_content: value, note }) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setError(j.error ?? "저장 실패"); return; }
    onSaved(j.request);
    setDialog({ type: "view", path });
  };

  return (
    <Modal isOpen onClose={onClose} title={`직접 수정 — ${path}`} size="xl" className="max-w-6xl">
      <div className="p-6 space-y-3">
        <p className="text-xs text-subtext">저장하면 바로 문서가 바뀌지 않고 <b className="text-amber-300">「반영 대기」</b>로 남습니다. 담당 세션이 다음 작업 때 그사이 바뀐 내용과 합쳐 문서에 반영하고, 반영되면 「수정 요청함」에 커밋 번호가 표시됩니다.</p>
        {doc.loading && <p className="text-subtext text-sm">원문을 불러오는 중…</p>}
        {doc.error && <p className="text-rose-300 text-sm">{doc.error}</p>}
        {!doc.loading && !doc.error && !doc.editable && <p className="text-rose-300 text-sm">문서가 너무 커서 화면에서 고칠 수 없습니다. 「관리자 지시 달기」로 고칠 내용을 남겨 주세요.</p>}
        {!doc.loading && !doc.error && doc.editable && (
          <>
            <div className="flex gap-2">
              <GoldButton size="sm" variant={preview ? "outline" : "gold"} onClick={() => setPreview(false)}><Pencil size={14} className="mr-1" />편집</GoldButton>
              <GoldButton size="sm" variant={preview ? "gold" : "outline"} onClick={() => setPreview(true)}><Eye size={14} className="mr-1" />미리보기</GoldButton>
            </div>
            {preview ? (
              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 p-4"><MarkdownView markdown={value} path={path} /></div>
            ) : (
              <textarea
                value={value}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                className="h-[60vh] w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-white/90 focus:border-gold/50 focus:outline-none"
              />
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="무엇을 왜 고쳤는지 한 줄(선택) — 담당 세션이 커밋 메시지에 참고합니다"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-subtext focus:border-gold/50 focus:outline-none"
            />
            {error && <p className="text-rose-300 text-sm">{error}</p>}
            <div className="flex gap-2">
              <GoldButton onClick={save} disabled={saving || text == null}>{saving ? "저장 중…" : "수정안 저장(반영 대기)"}</GoldButton>
              <GoldButton variant="outline" onClick={() => setDialog({ type: "view", path })}>취소</GoldButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function NoteDialog({ kind, target, title, onClose, onSaved }: { kind: "doc_comment" | "role_note"; target: string; title: string; onClose: () => void; onSaved: (r: DevRequest) => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const save = async () => {
    setSaving(true); setError("");
    const body = kind === "doc_comment" ? { kind, target_path: target, note } : { kind, target_role: target, note };
    const r = await fetch("/api/admin/dev-docs/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setError(j.error ?? "저장 실패"); return; }
    onSaved(j.request);
    setDone(true);
  };
  return (
    <Modal isOpen onClose={onClose} title={kind === "doc_comment" ? `관리자 지시 — ${title}` : `역할 메모 — ${title}`} size="lg">
      <div className="p-6 space-y-3">
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-white/85">
          {kind === "doc_comment" ? (
            <>이 지시는 <b className="text-gold">관리자의 절대 지시</b>로 저장됩니다. 담당 세션이 다음 작업 때 이 문서 맨 위 「🗣 주인님(관리자) 지시」 칸에 옮겨 적고, 그 문서를 읽는 모든 CLI는 문서 내용보다 이 지시를 먼저 따릅니다.</>
          ) : (
            <>이 메모는 <b className="text-gold">관리자의 절대 지시</b>로 저장됩니다. 이 역할의 담당 세션이 다음 작업을 시작할 때 읽고, 작업 방향을 이 지시에 맞춥니다.</>
          )}
        </div>
        {done ? (
          <>
            <p className="text-sm text-emerald-300">저장했습니다. 담당 세션이 다음 작업 때 반영합니다(「수정 요청함」에서 상태를 볼 수 있습니다).</p>
            <GoldButton variant="outline" onClick={onClose}>닫기</GoldButton>
          </>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={kind === "doc_comment" ? "예) 이 지침의 3번 규칙은 이번 주부터 적용하지 말 것. 대신 …" : "예) 다음 작업은 E-5보다 블로그 정리를 먼저 할 것"}
              className="h-48 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white placeholder:text-subtext focus:border-gold/50 focus:outline-none"
            />
            {error && <p className="text-rose-300 text-sm">{error}</p>}
            <div className="flex gap-2">
              <GoldButton onClick={save} disabled={saving || !note.trim()}>{saving ? "저장 중…" : "지시 저장"}</GoldButton>
              <GoldButton variant="outline" onClick={onClose}>취소</GoldButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function RequestDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [req, setReq] = useState<(DevRequest & { proposed_content?: string | null }) | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/admin/dev-docs/requests?id=${encodeURIComponent(id)}`)
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => (ok ? setReq(j.request) : setError(j.error ?? "읽기 실패")))
      .catch(() => setError("네트워크 오류"));
  }, [id]);
  return (
    <Modal isOpen onClose={onClose} title="요청 자세히" size="xl" className="max-w-5xl">
      <div className="p-6 space-y-3 text-sm">
        {error && <p className="text-rose-300">{error}</p>}
        {!req && !error && <p className="text-subtext">불러오는 중…</p>}
        {req && (
          <>
            <p className="text-subtext">{KIND_LABEL[req.kind]} · {req.target_path ?? `역할 ${req.target_role}`} · {new Date(req.created_at).toLocaleString("ko-KR")}</p>
            {req.note && <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-white/90">{req.note}</div>}
            {req.proposed_content && (
              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 p-4">
                <MarkdownView markdown={req.proposed_content} path={req.target_path ?? undefined} />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
