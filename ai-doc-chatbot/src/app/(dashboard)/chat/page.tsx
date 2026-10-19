"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Check, Copy, FileText, Globe, Loader2, MessageSquarePlus, PanelLeft, Pencil, Pin, PinOff, RotateCcw, Search, Send, Trash2, User, X } from "lucide-react";
import { ErrorNote, INPUT } from "@/components/studio/ui";
import { Markdown } from "@/components/chat/Markdown";

interface Source {
  type: "doc" | "web";
  title: string;
  url?: string;
  snippet?: string;
  published?: string;
}
interface Msg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  created_at?: string;
  pending?: boolean;
}
interface Room {
  id: string;
  title: string;
  updated_at: string;
  pinned?: boolean;
}

function timeLabel(iso?: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

const EXAMPLES = ["올린 문서의 핵심 내용을 5줄로 요약해 줘", "오늘 AI 업계 주요 뉴스 알려 줘", "바이브코딩을 처음 배우는 순서를 알려 줘"];

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pinSupported, setPinSupported] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [useDocs, setUseDocs] = useState(true);
  const [webAuto, setWebAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; needKey?: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showRooms, setShowRooms] = useState(false);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [roomQuery, setRoomQuery] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [onlyDoc, setOnlyDoc] = useState<{ id: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    const r = await fetch("/api/rooms", { cache: "no-store" }).then((x) => x.json()).catch(() => ({}));
    setRooms(r.rooms ?? []);
    setPinSupported(r.pinSupported === true);
  }, []);

  useEffect(() => {
    void loadRooms();
    const wantDoc = new URLSearchParams(window.location.search).get("doc");
    fetch("/api/documents", { cache: "no-store" })
      .then((x) => x.json())
      .then((d) => {
        const list = (d.documents ?? []) as { id: string; name: string }[];
        setDocCount(list.length);
        // 「이 문서로 질문」(U4): 내 문서에서 넘어온 경우 그 문서만 참고
        const picked = wantDoc ? list.find((x) => x.id === wantDoc) : undefined;
        if (picked) setOnlyDoc({ id: picked.id, name: picked.name });
      })
      .catch(() => setDocCount(0));
  }, [loadRooms]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function openRoom(id: string) {
    if (busy) return;
    setError(null);
    setNotice(null);
    setShowRooms(false);
    const r = await fetch(`/api/rooms/${id}`, { cache: "no-store" }).then((x) => x.json()).catch(() => ({}));
    if (!r.room) return setError({ text: r.error ?? "대화를 불러오지 못했습니다." });
    setRoomId(id);
    setMessages(r.messages ?? []);
  }

  function newChat() {
    if (busy) return;
    setRoomId(null);
    setMessages([]);
    setError(null);
    setNotice(null);
    setShowRooms(false);
  }

  async function deleteRoom(id: string) {
    if (!confirm("이 대화를 삭제할까요? 삭제하면 되돌릴 수 없습니다.")) return;
    await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
    if (id === roomId) newChat();
    void loadRooms();
  }

  async function renameRoom() {
    if (!editing) return;
    const title = editing.title.trim();
    setEditing(null);
    if (!title) return;
    const r = await fetch(`/api/rooms/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }).then((x) => x.json()).catch(() => ({}));
    if (r.error) setError({ text: r.error });
    void loadRooms();
  }

  /** 대화 고정/해제(U3) — 고정한 대화는 목록 맨 위 */
  async function togglePin(room: Room) {
    const r = await fetch(`/api/rooms/${room.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !room.pinned }) }).then((x) => x.json()).catch(() => ({}));
    if (r.error) setError({ text: r.error });
    void loadRooms();
  }

  async function copyAnswer(i: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
    } catch {
      setError({ text: "복사하지 못했습니다. 답변을 직접 선택해 복사해 주세요." });
    }
  }

  /** 마지막 답변 다시 생성(U3) — 마지막 질문을 같은 방에서 다시 보낸다(서버가 이전 질문·답변을 지움) */
  function regenerate() {
    if (busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((m) => m.slice(0, Math.max(0, m.length - 2)));
    void send(lastUser.content, true);
  }

  async function send(text?: string, isRegenerate = false) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    if (!isRegenerate) setInput("");
    setError(null);
    setNotice(null);
    setBusy(true);
    setStage(useDocs && docCount ? "내 문서에서 찾는 중…" : webAuto ? "웹 검색이 필요한지 판단하는 중…" : "답변을 만드는 중…");
    setMessages((m) => [...m, { role: "user", content: question, created_at: new Date().toISOString() }, { role: "assistant", content: "", pending: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message: question, useDocs, web: webAuto ? "auto" : "off", documentId: useDocs ? onlyDoc?.id : undefined, regenerate: isRegenerate }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setMessages((m) => m.slice(0, -1));
        setError({ text: d.error ?? "답변을 만들지 못했습니다.", needKey: d.needApiKey });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const patchLast = (fn: (msg: Msg) => Msg) => setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { type: string; roomId?: string; sources?: Source[]; webNote?: string | null; text?: string; error?: string; createdAt?: string };
          if (ev.type === "meta") {
            if (ev.roomId) setRoomId(ev.roomId);
            patchLast((msg) => ({ ...msg, sources: ev.sources ?? [] }));
            if (ev.webNote === "no_key") setNotice("Tavily 키를 등록하면 최신 정보가 필요한 질문을 웹에서 찾아 답합니다.");
            else if (ev.webNote?.startsWith("error:")) setNotice(`웹 검색을 하지 못해 검색 없이 답했습니다. ${ev.webNote.slice(6)}`);
            setStage("답변을 쓰는 중…");
          } else if (ev.type === "delta") {
            patchLast((msg) => ({ ...msg, content: msg.content + (ev.text ?? "") }));
          } else if (ev.type === "done") {
            patchLast((msg) => ({ ...msg, pending: false, created_at: ev.createdAt ?? new Date().toISOString() }));
          } else if (ev.type === "error") {
            if (ev.roomId) setRoomId(ev.roomId);
            patchLast((msg) => ({ ...msg, pending: false }));
            setError({ text: ev.error ?? "답변을 만들지 못했습니다." });
          }
        }
      }
    } catch {
      setError({ text: "연결이 끊겼습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setMessages((m) => m.filter((x) => !(x.pending && !x.content)).map((x) => ({ ...x, pending: false })));
      setBusy(false);
      setStage(null);
      void loadRooms();
    }
  }

  const q = roomQuery.trim().toLowerCase();
  const visibleRooms = q ? rooms.filter((r) => r.title.toLowerCase().includes(q)) : rooms;
  const lastAssistant = messages.length - 1;

  const roomList = (
    <div className="flex h-full flex-col">
      <button type="button" onClick={newChat} className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2.5 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20">
        <MessageSquarePlus className="h-4 w-4" /> 새 대화
      </button>
      {rooms.length > 0 && (
        <label className="mb-2 flex items-center gap-1.5 rounded-lg border border-[#262c3d] bg-[#11141c] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input value={roomQuery} onChange={(e) => setRoomQuery(e.target.value)} placeholder="대화 검색" aria-label="대화 검색" className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600" />
        </label>
      )}
      <p className="mb-1.5 px-1 text-[11px] text-slate-500">대화 기록 (30일 보관)</p>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {rooms.length === 0 && <p className="px-1 text-xs text-slate-500">아직 대화가 없습니다.</p>}
        {rooms.length > 0 && !visibleRooms.length && <p className="px-1 text-xs text-slate-500">「{roomQuery}」 대화가 없습니다.</p>}
        {visibleRooms.map((r) => (
          <div key={r.id} className={`group flex items-center gap-1 rounded-lg ${r.id === roomId ? "bg-[#1e2230]" : "hover:bg-[#161922]"}`}>
            {editing?.id === r.id ? (
              <input
                autoFocus
                aria-label="대화 이름"
                value={editing.title}
                maxLength={60}
                onChange={(e) => setEditing({ id: r.id, title: e.target.value })}
                onBlur={() => void renameRoom()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) void renameRoom();
                  if (e.key === "Escape") setEditing(null);
                }}
                className="m-1 min-w-0 flex-1 rounded border border-indigo-500/50 bg-[#11141c] px-2 py-1.5 text-xs text-slate-100 outline-none"
              />
            ) : (
              <button type="button" onClick={() => void openRoom(r.id)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                <p className="truncate text-xs font-semibold text-slate-200">{r.pinned && <Pin className="mr-1 inline h-3 w-3 text-amber-300" aria-label="고정됨" />}{r.title}</p>
                <p className="text-[10px] text-slate-500">{timeLabel(r.updated_at)}</p>
              </button>
            )}
            {pinSupported && (
              <button type="button" aria-label={r.pinned ? "대화 고정 해제" : "대화 고정"} title={r.pinned ? "고정 해제" : "맨 위에 고정"} onClick={() => void togglePin(r)} className={`rounded p-1.5 hover:bg-amber-500/10 hover:text-amber-200 group-hover:opacity-100 ${r.pinned ? "text-amber-300 opacity-100" : "text-slate-500 opacity-60"}`}>
                {r.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            )}
            <button type="button" aria-label="대화 이름 바꾸기" onClick={() => setEditing({ id: r.id, title: r.title })} className="rounded p-1.5 text-slate-500 opacity-60 hover:bg-indigo-500/10 hover:text-indigo-200 group-hover:opacity-100">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="대화 삭제" onClick={() => void deleteRoom(r.id)} className="mr-1 rounded p-1.5 text-slate-500 opacity-60 hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] sm:-m-6 md:-m-8 md:h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-[#1f2433] bg-[#0b0d14] p-3 lg:block">{roomList}</aside>
      {showRooms && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRooms(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-[#1f2433] bg-[#0b0d14] p-3 pt-16 md:pt-3">{roomList}</div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-[#1f2433] px-4 py-3">
          <button type="button" aria-label="대화 목록" onClick={() => setShowRooms(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-[#161922] lg:hidden">
            <PanelLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-sm font-bold text-slate-100">{roomId ? rooms.find((r) => r.id === roomId)?.title ?? "대화" : "새 대화"}</h1>
          <span className="ml-auto text-[11px] text-slate-500">{docCount ? `📄 내 문서 ${docCount}개` : ""}</span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
                  <Bot className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-100">무엇이든 물어보세요</h2>
                <p className="mt-1 text-sm text-slate-400">올린 문서와 최신 웹 정보를 근거로, 출처까지 함께 답합니다.</p>
                {docCount === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    내 문서로 답하게 하려면 <Link href="/documents" className="font-bold text-indigo-300 underline">내 문서</Link>에 PDF·문서를 먼저 올려 주세요.
                  </p>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((e) => (
                    <button key={e} type="button" onClick={() => void send(e)} className="rounded-full border border-[#262c3d] bg-[#161922] px-3.5 py-2 text-xs text-slate-300 hover:border-indigo-500/40 hover:text-slate-100">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-[#262c3d] text-slate-300" : "bg-indigo-500/20 text-indigo-300"}`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[85%] ${m.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block break-words rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${m.role === "user" ? "whitespace-pre-wrap bg-indigo-600 text-white" : "max-w-full border border-[#262c3d] bg-[#161922] text-slate-100"}`}>
                    {m.content ? (
                      m.role === "assistant" ? <Markdown text={m.content} /> : m.content
                    ) : m.pending ? (
                      <span className="inline-flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />{stage}</span>
                    ) : (
                      ""
                    )}
                  </div>
                  {m.role === "assistant" && !!m.sources?.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-slate-500">참고:</span>
                      {m.sources.map((s, k) =>
                        s.type === "web" && s.url ? (
                          <a key={k} href={s.url} target="_blank" rel="noreferrer" title={s.url} className="inline-flex max-w-[16rem] items-center gap-1 truncate rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200 hover:bg-sky-500/20">
                            <Globe className="h-3 w-3 shrink-0" /> <span className="truncate">{s.title}</span>
                          </a>
                        ) : (
                          <button
                            key={k}
                            type="button"
                            aria-expanded={expanded === `${i}-${k}`}
                            title={s.snippet ? "눌러서 근거 내용 보기" : s.title}
                            onClick={() => setExpanded((x) => (x === `${i}-${k}` ? null : `${i}-${k}`))}
                            className={`inline-flex max-w-[16rem] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] ${expanded === `${i}-${k}` ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-100" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"}`}
                          >
                            <FileText className="h-3 w-3 shrink-0" /> <span className="truncate">{s.title}</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                  {m.role === "assistant" &&
                    m.sources?.map((s, k) =>
                      expanded === `${i}-${k}` ? (
                        <div key={`x${k}`} className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left text-xs leading-relaxed text-slate-300">
                          <p className="mb-1 flex items-center gap-1 font-bold text-emerald-200">
                            <FileText className="h-3.5 w-3.5" /> {s.title}에서 찾은 근거
                            <button type="button" aria-label="근거 닫기" onClick={() => setExpanded(null)} className="ml-auto rounded p-0.5 text-slate-500 hover:text-slate-200">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </p>
                          <p className="whitespace-pre-wrap">{s.snippet || "이 답변은 근거 내용 미리보기가 저장되기 전(v1.04 이전)에 만들어졌습니다."}</p>
                        </div>
                      ) : null
                    )}
                  {m.role === "assistant" && !m.pending && m.content && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <button type="button" onClick={() => void copyAnswer(i, m.content)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-500 hover:bg-[#161922] hover:text-slate-200">
                        {copied === i ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />} {copied === i ? "복사됨" : "복사"}
                      </button>
                      {i === lastAssistant && !busy && (
                        <button type="button" onClick={regenerate} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-500 hover:bg-[#161922] hover:text-slate-200">
                          <RotateCcw className="h-3.5 w-3.5" /> 다시 생성
                        </button>
                      )}
                    </div>
                  )}
                  {m.created_at && !m.pending && <p className="mt-1 text-[10px] text-slate-500">{timeLabel(m.created_at)}</p>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-[#1f2433] px-4 py-3">
          <div className="mx-auto max-w-3xl space-y-2">
            {error && <ErrorNote message={error.text} needKey={error.needKey} />}
            {notice && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{notice}</p>}
            {onlyDoc && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">「{onlyDoc.name}」만 참고해서 답합니다</span>
                <button type="button" aria-label="모든 문서 참고로 돌아가기" onClick={() => setOnlyDoc(null)} className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-500/20">
                  <X className="h-3 w-3" /> 전체 문서로
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                className={`${INPUT} max-h-40 min-h-[48px] resize-none`}
                rows={1}
                value={input}
                placeholder="질문을 입력하세요 (Enter 보내기 · Shift+Enter 줄바꿈)"
                aria-label="질문 입력"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button type="button" aria-label="보내기" onClick={() => void send()} disabled={busy || !input.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={useDocs} onChange={(e) => setUseDocs(e.target.checked)} /> 📄 내 문서 참고
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={webAuto} onChange={(e) => setWebAuto(e.target.checked)} /> 🌐 웹 검색(필요할 때 자동)
              </label>
              <span className="ml-auto text-[10px] text-slate-500">AI 답변은 틀릴 수 있으니 중요한 내용은 출처를 확인하세요.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
