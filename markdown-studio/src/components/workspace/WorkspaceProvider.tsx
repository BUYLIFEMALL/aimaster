"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DocumentRepository } from "@/lib/documents/repository";
import { DEFAULT_PREFERENCES, type DocumentNode, type WorkspacePreferences } from "@/lib/documents/model";

type Draft = { id: string; markdown: string; baseMarkdown: string; revision: number };
type Store = {
  nodes: DocumentNode[]; preferences: WorkspacePreferences; loaded: boolean;
  error: string; saving: boolean; draft: Draft | null; dirty: boolean;
  reportError: (error: unknown) => void;
  edit: (value: string) => void; save: () => Promise<void>;
  refresh: () => Promise<void>; select: (id: string) => Promise<void>;
  run: <T>(action: (repo: DocumentRepository) => Promise<T>) => Promise<T>;
  /** run과 같지만 실패해도 문서 저장 오류 상태를 바꾸지 않는다(Google Drive 등 외부 통신용) */
  runQuiet: <T>(action: (repo: DocumentRepository) => Promise<T>) => Promise<T>;
  setPreferences: (value: Partial<WorkspacePreferences>) => Promise<void>;
  reloadDraft: () => Promise<void>; downloadDraft: () => void;
};
const WorkspaceContext = createContext<Store | null>(null);
export const messageForError = (e: unknown) => e instanceof Error ? e.message : "작업을 처리하지 못했습니다. 다시 시도해 주세요.";

export function downloadText(name: string, text: string, mime = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a"); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkspaceProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [preferences, setPrefs] = useState<WorkspacePreferences>({ ...DEFAULT_PREFERENCES });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraftState] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const repoRef = useRef<DocumentRepository | null>(null);
  const prefsRef = useRef<WorkspacePreferences>({ ...DEFAULT_PREFERENCES });
  const saveRef = useRef<Promise<void> | null>(null);
  const prefsSaveRef = useRef<Promise<void>>(Promise.resolve());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const aliveRef = useRef(false);
  const setDraft = useCallback((next: Draft | null) => { draftRef.current = next; setDraftState(next); }, []);
  const checkSession = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store", credentials: "same-origin" });
    const result = await response.json().catch(() => ({}));
    if (!aliveRef.current) throw new Error("화면이 닫혀 작업을 중단했습니다.");
    if (!response.ok || result.userId !== userId) {
      if (response.status === 401 || response.status === 403 || (response.ok && result.userId !== userId)) {
        setNodes([]); setDraft(null); setLoaded(false);
        setLocked("로그인 계정 또는 이용 권한이 바뀌었습니다. 다시 로그인해 주세요.");
      }
      throw new Error(result.error || "로그인 계정을 확인할 수 없습니다. 저장되지 않은 원고를 내려받은 뒤 다시 시도해 주세요.");
    }
  }, [userId, setDraft]);
  const refresh = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) throw new Error("문서 보관함을 아직 열지 못했습니다.");
    const next = await repo.list();
    if (aliveRef.current) setNodes(next);
    return next;
  }, []);
  const run = useCallback(async <T,>(action: (repo: DocumentRepository) => Promise<T>): Promise<T> => {
    try {
      await checkSession();
      const repo = repoRef.current;
      if (!repo) throw new Error("문서 보관함을 아직 열지 못했습니다.");
      const result = await action(repo);
      await refresh(); channelRef.current?.postMessage({ changed: true });
      setError(""); return result;
    } catch (e) { if (aliveRef.current) setError(messageForError(e)); throw e; }
  }, [checkSession, refresh]);
  const runQuiet = useCallback(async <T,>(action: (repo: DocumentRepository) => Promise<T>): Promise<T> => {
    await checkSession();
    const repo = repoRef.current;
    if (!repo) throw new Error("문서 보관함을 아직 열지 못했습니다.");
    const result = await action(repo);
    await refresh(); channelRef.current?.postMessage({ changed: true });
    return result;
  }, [checkSession, refresh]);
  const save = useCallback(async function flush(): Promise<void> {
    if (saveRef.current) { await saveRef.current; return flush(); }
    const captured = draftRef.current;
    if (!captured || captured.markdown === captured.baseMarkdown) return;
    setSaving(true);
    const promise = (async () => {
      const saved = await run(repo => repo.update(captured.id, captured.revision, { markdown: captured.markdown }));
      const latest = draftRef.current;
      if (latest?.id === captured.id) setDraft({ ...latest, baseMarkdown: captured.markdown, revision: saved.revision });
    })();
    saveRef.current = promise;
    try { await promise; } finally { saveRef.current = null; if (aliveRef.current) setSaving(false); }
    // If text changed during the request, the caller awaits its save as well.
    if (draftRef.current?.markdown !== draftRef.current?.baseMarkdown) return flush();
  }, [run, setDraft]);
  const setPreferences = useCallback((value: Partial<WorkspacePreferences>) => {
    const operation = prefsSaveRef.current.catch(() => {}).then(async () => {
      const next = { ...prefsRef.current, ...value };
      await run(repo => repo.savePreferences(next));
      prefsRef.current = next; setPrefs(next);
    });
    prefsSaveRef.current = operation;
    return operation;
  }, [run]);
  const select = useCallback(async (id: string) => {
    await save();
    const rows = await refresh();
    const node = rows.find(n => n.id === id && n.kind === "document" && !n.deletedAt);
    if (!node) throw new Error("선택한 문서를 찾을 수 없습니다.");
    await setPreferences({ activeId: id });
    setDraft({ id, markdown: node.markdown, baseMarkdown: node.markdown, revision: node.revision });
  }, [save, refresh, setPreferences, setDraft]);
  const reloadDraft = useCallback(async () => {
    await checkSession();
    const rows = await refresh();
    const node = rows.find(n => n.id === draftRef.current?.id && !n.deletedAt);
    setDraft(node ? { id: node.id, markdown: node.markdown, baseMarkdown: node.markdown, revision: node.revision } : null);
    setError("");
  }, [checkSession, refresh, setDraft]);

  useEffect(() => {
    aliveRef.current = true;
    const repo = new DocumentRepository(userId); repoRef.current = repo;
    let disposed = false;
    let channel: BroadcastChannel | null = null;
    const verify = () => { void checkSession().catch(e => { if (!disposed) setError(messageForError(e)); }); };
    void (async () => {
      try {
        await checkSession();
        const [rows, prefs] = await Promise.all([repo.list(), repo.preferences()]);
        if (disposed) return;
        prefsRef.current = prefs; setPrefs(prefs); setNodes(rows);
        const active = rows.find(n => n.id === prefs.activeId && !n.deletedAt && n.kind === "document");
        if (active) setDraft({ id: active.id, markdown: active.markdown, baseMarkdown: active.markdown, revision: active.revision });
        setLoaded(true);
        if (typeof BroadcastChannel !== "undefined") {
          channel = new BroadcastChannel(`aimaster-markdown-${userId}`); channelRef.current = channel;
          channel.onmessage = () => { void checkSession().then(() => refresh()).catch(e => { if (!disposed) setError(messageForError(e)); }); };
        }
      } catch (e) { if (!disposed) setError(`문서 보관함을 열지 못했습니다. ${messageForError(e)}`); }
    })();
    const timer = window.setInterval(verify, 60_000);
    window.addEventListener("focus", verify);
    return () => { disposed = true; aliveRef.current = false; clearInterval(timer); window.removeEventListener("focus", verify); channel?.close(); channelRef.current = null; repoRef.current = null; void repo.close().catch(() => {}); };
  }, [userId, checkSession, refresh, setDraft]);
  const dirty = !!draft && draft.markdown !== draft.baseMarkdown;
  useEffect(() => {
    if (!dirty || error) return;
    const timer = setTimeout(() => { void save().catch(() => {}); }, 750);
    return () => clearTimeout(timer);
  }, [draft, dirty, error, save]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (draftRef.current && draftRef.current.markdown !== draftRef.current.baseMarkdown) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler);
  }, []);
  if (locked) return <main className="welcome"><div className="card"><h1>로그인 확인이 필요합니다</h1><p role="alert">{locked}</p><a className="button primary" href="/login">다시 로그인</a></div></main>;
  return <WorkspaceContext.Provider value={{ nodes, preferences, loaded, error, saving, draft, dirty,
    reportError: value => setError(messageForError(value)),
    edit: value => { const current = draftRef.current; if (current) setDraft({ ...current, markdown: value }); },
    save, run, runQuiet, refresh: async () => { await checkSession(); await refresh(); }, select, setPreferences, reloadDraft,
    downloadDraft: () => { if (draftRef.current) downloadText("저장되지않은원고.md", draftRef.current.markdown); },
  }}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error("문서 작업실이 준비되지 않았습니다.");
  return store;
}
