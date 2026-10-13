"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createDriveApi, driveMessage } from "@/lib/drive/api";
import { clearToken, connectGoogle, currentToken, disconnectGoogle, hasToken, isValidClientId } from "@/lib/drive/auth";
import { ensureRootFolder, listRemote, pullEntries, uploadDocuments, type PullResult, type PullStrategy, type RemoteEntry, type UploadResult } from "@/lib/drive/sync";
import { useWorkspace } from "./WorkspaceProvider";

export interface DriveAccount { accountId: string; email: string; name: string }
interface DriveStore {
  loaded: boolean; clientId: string; account: DriveAccount | null; connecting: boolean; busy: boolean; message: string; error: string;
  uploadResults: UploadResult[]; remote: RemoteEntry[] | null; remoteIgnored: number; pullResults: PullResult[];
  saveClientId: (value: string) => Promise<void>;
  connect: () => Promise<void>; disconnect: () => Promise<void>; forget: () => Promise<void>;
  upload: (ids: string[], force?: boolean) => Promise<void>;
  loadRemote: () => Promise<void>;
  pull: (entries: RemoteEntry[], strategy: PullStrategy) => Promise<void>;
}
const DriveContext = createContext<DriveStore | null>(null);

/** Google Drive 연결 상태·동작. 토큰은 메모리(lib/drive/auth)에만 있고 이 컴포넌트가 사라지면 지운다 */
export function DriveProvider({ children }: { children: React.ReactNode }) {
  const store = useWorkspace();
  const [loaded, setLoaded] = useState(false);
  const [clientId, setClientId] = useState("");
  const [account, setAccount] = useState<DriveAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [remote, setRemote] = useState<RemoteEntry[] | null>(null);
  const [remoteIgnored, setRemoteIgnored] = useState(0);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const accountRef = useRef<DriveAccount | null>(null);
  const clientRef = useRef("");

  useEffect(() => {
    let alive = true;
    if (store.loaded) store.runQuiet(repo => repo.driveSettings()).then(s => { if (alive) { setClientId(s.clientId); clientRef.current = s.clientId; setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loaded]);
  useEffect(() => () => clearToken(), []);
  // 토큰이 만료되면 연결 상태를 해제로 표시한다(조용히 새로 받지 않음)
  useEffect(() => {
    if (!account) return;
    const timer = window.setInterval(() => { if (!hasToken()) { setAccount(null); accountRef.current = null; setError("Google 연결이 만료되었습니다. 다시 연결해 주세요."); } }, 20_000);
    return () => clearInterval(timer);
  }, [account]);

  const reset = () => { setUploadResults([]); setRemote(null); setPullResults([]); setRemoteIgnored(0); };
  const fail = (e: unknown) => { setError(driveMessage(e)); };
  const session = () => {
    const acc = accountRef.current;
    if (!acc) throw new Error("먼저 Google에 연결해 주세요.");
    return { api: createDriveApi({ getToken: currentToken }), accountId: acc.accountId };
  };

  const saveClientId = useCallback(async (value: string) => {
    setError(""); setMessage("");
    const id = value.trim();
    if (id && !isValidClientId(id)) { setError("Client ID 형식이 올바르지 않습니다. '숫자-문자.apps.googleusercontent.com' 형태로 입력해 주세요."); return; }
    try {
      if (accountRef.current && id !== clientRef.current) { await disconnectGoogle(); setAccount(null); accountRef.current = null; reset(); }
      const prev = await store.runQuiet(repo => repo.driveSettings());
      await store.runQuiet(repo => repo.saveDriveSettings({ clientId: id, lastAccountId: prev.lastAccountId }));
      setClientId(id); clientRef.current = id;
      setMessage(id ? "Client ID를 이 브라우저에 저장했습니다. 이제 'Google에 연결'을 눌러 주세요." : "Client ID를 지웠습니다.");
    } catch (e) { fail(e); }
  }, [store]);

  const connect = useCallback(async () => {
    setError(""); setMessage(""); setConnecting(true);
    try {
      await connectGoogle(clientRef.current);
      const api = createDriveApi({ getToken: currentToken });
      const info = await api.about();
      const prev = await store.runQuiet(repo => repo.driveSettings());
      await store.runQuiet(repo => repo.saveDriveSettings({ clientId: clientRef.current, lastAccountId: info.accountId }));
      accountRef.current = info; setAccount(info);
      setMessage(prev.lastAccountId && prev.lastAccountId !== info.accountId
        ? `${info.email} 계정에 연결했습니다. 이전에 연결한 다른 Google 계정의 연결 기록은 사용하지 않고 이 계정은 새로 시작합니다.`
        : `${info.email} 계정에 연결했습니다.`);
    } catch (e) { clearToken(); accountRef.current = null; setAccount(null); fail(e); }
    finally { setConnecting(false); }
  }, [store]);

  const disconnect = useCallback(async () => {
    setError(""); await disconnectGoogle(); accountRef.current = null; setAccount(null); reset(); setMessage("연결을 해제했습니다. 이 브라우저에서 Google 접근 토큰을 지웠습니다.");
  }, []);

  const forget = useCallback(async () => {
    const acc = accountRef.current; if (!acc) { setError("먼저 Google에 연결해야 이 계정의 연결 기록을 지울 수 있습니다."); return; }
    try { await store.runQuiet(repo => repo.forgetDriveAccount(acc.accountId)); reset(); setMessage("이 기기의 Drive 연결 기록을 지웠습니다. Drive의 파일은 그대로 있습니다."); } catch (e) { fail(e); }
  }, [store]);

  const guarded = useCallback(async (work: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); }
    catch (e) { fail(e); if (e instanceof Error && (e as { code?: string }).code === "AUTH") { clearToken(); accountRef.current = null; setAccount(null); } }
    finally { setBusy(false); }
  }, []);

  const upload = useCallback((ids: string[], force = false) => guarded(async () => {
    await store.save();
    const s = session();
    const rootId = await store.runQuiet(repo => ensureRootFolder(repo, s));
    const results = await store.runQuiet(repo => uploadDocuments(repo, s, rootId, ids, { force }));
    setUploadResults(results);
    const ok = results.filter(r => r.status === "created" || r.status === "updated").length;
    const bad = results.filter(r => r.status === "failed" || r.status === "conflict").length;
    setMessage(`Google Drive 확인 결과: 올림 ${ok}개 · 변경 없음 ${results.filter(r => r.status === "unchanged").length}개${bad ? ` · 실패/충돌 ${bad}개` : ""}.`);
  }), [guarded, store]);

  const loadRemote = useCallback(() => guarded(async () => {
    const s = session();
    const rootId = await store.runQuiet(repo => ensureRootFolder(repo, s));
    const out = await store.runQuiet(repo => listRemote(repo, s, rootId));
    setRemote(out.entries); setRemoteIgnored(out.ignored); setPullResults([]);
    setMessage(out.entries.length ? `Drive에서 마크다운 파일 ${out.entries.length}개를 찾았습니다.` : "Drive의 '마크다운 문서 자동화' 폴더에 가져올 마크다운 파일이 없습니다.");
  }), [guarded, store]);

  const pull = useCallback((entries: RemoteEntry[], strategy: PullStrategy) => guarded(async () => {
    await store.save();
    const s = session();
    const results = await store.runQuiet(repo => pullEntries(repo, s, entries, strategy));
    setPullResults(results);
    const ok = results.filter(r => r.status === "imported" || r.status === "copied" || r.status === "replaced").length;
    const bad = results.filter(r => r.status === "failed").length;
    setMessage(`가져오기 결과: 성공 ${ok}개${bad ? ` · 실패 ${bad}개` : ""}.`);
    const rootId = await store.runQuiet(repo => ensureRootFolder(repo, s));
    const refreshed = await store.runQuiet(repo => listRemote(repo, s, rootId));
    setRemote(refreshed.entries);
  }), [guarded, store]);

  return <DriveContext.Provider value={{ loaded, clientId, account, connecting, busy, message, error, uploadResults, remote, remoteIgnored, pullResults,
    saveClientId, connect, disconnect, forget, upload, loadRemote, pull }}>{children}</DriveContext.Provider>;
}
export function useDrive() {
  const v = useContext(DriveContext);
  if (!v) throw new Error("Google Drive 기능이 준비되지 않았습니다.");
  return v;
}
