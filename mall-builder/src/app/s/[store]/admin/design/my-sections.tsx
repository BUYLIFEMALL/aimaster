"use client";

// 디자인 빌더 E3 「내 섹션」 — 편집기 머리 단추 2개(저장·넣기)와 창(2026-11-15, 플랜 docs/PLAN_20261115_MY_SECTIONS.md)
// 넣기는 편집기 안에서만 바뀌고(초안 저장·게시는 평소 단추), 다른 몰 섹션은 sections.ts prepareInsert가 상품 출처를 「신상품」으로 바꾼다

import { useEffect, useRef, useState } from "react";
import { useGetPuck } from "@puckeditor/core";
import { BLOCK_DEFS, SCHEMA_VERSION, type Block } from "@/lib/blocks";
import { fromPuckRaw, toPuck } from "@/lib/builder/puck-adapter";
import { prepareInsert, MAX_SECTION_BLOCKS, type MySection } from "@/lib/builder/sections";
import { deleteMySectionAction, listMySectionsAction, saveMySectionAction } from "@/lib/builder/section-actions";

type Mode = null | "save" | "insert";

// 서버 호출이 오류로 끊겨도(개발 서버 재시작·네트워크) 단추가 「저장 중...」에 멈추지 않게 결과 형태로 바꾼다
const NET_FAIL = "서버와 연결이 끊겼습니다. 잠시 뒤 다시 시도해 주세요.";
async function safe<T>(fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch {
    return { ok: false, error: NET_FAIL };
  }
}

// 상태는 이 컴포넌트 안에 둔다(편집기마다 따로). 머리 단추 영역은 design-editor.tsx의 고정 컴포넌트(HeaderActionsSlot)라
// 블록을 넣어도 다시 만들어지지 않고, 몰이 바뀌면 key={storeId}로 새로 만들어진다(2026-11-16 FRONT-20261116-04)
export function MySectionsButtons({ storeId }: { storeId: string }) {
  const getPuck = useGetPuck();
  const [mode, setMode] = useState<Mode>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // 저장 창
  const [current, setCurrent] = useState<Block[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  // 넣기 창
  const [list, setList] = useState<MySection[] | null>(null);
  // 늦게 온 응답 막기 — 화면을 떠났거나(alive) 창을 다시 열고 닫아 더 새 요청이 생겼으면(req) 그 결과를 버린다
  const alive = useRef(true);
  const req = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const begin = () => ++req.current;
  const latest = (id: number) => alive.current && id === req.current;
  const close = () => {
    begin();
    setMode(null);
  };

  const openSave = () => {
    begin();
    const raw = fromPuckRaw(getPuck().appState.data).blocks as Block[];
    setCurrent(raw);
    setPicked(new Set());
    setName("");
    setMsg("");
    setMode("save");
  };
  const openInsert = async () => {
    const id = begin();
    setMsg("");
    setList(null);
    setMode("insert");
    const r = await safe(() => listMySectionsAction());
    if (!latest(id)) return;
    if (r.ok) setList(r.sections);
    else setMsg(r.error);
  };

  const save = async () => {
    const id = begin();
    const blocks = current.filter((_, i) => picked.has(i));
    setBusy(true);
    try {
      const r = await safe(() => saveMySectionAction(storeId, name, blocks));
      if (!latest(id)) return;
      if (!r.ok) return setMsg(r.error);
      setMsg(`「${name.trim()}」 섹션을 저장했습니다. 다른 몰 편집기에서도 「내 섹션 넣기」로 쓸 수 있습니다.`);
      setPicked(new Set());
    } finally {
      if (alive.current) setBusy(false); // 늦은 응답·예외여도 「저장 중」은 꼭 푼다
    }
  };

  const insert = (s: MySection) => {
    const { appState, dispatch } = getPuck();
    const existingIds = (fromPuckRaw(appState.data).blocks as Block[]).map((b) => String(b.id));
    const { blocks, notes } = prepareInsert(s.blocks, { sameStore: s.source_store_id === storeId, existingIds });
    if (!blocks.length) return setMsg(notes.join(" ") || "넣을 블록이 없습니다.");
    const items = toPuck({ schema_version: SCHEMA_VERSION, blocks }).content;
    dispatch({ type: "setData", data: (prev) => ({ content: [...(prev.content ?? []), ...items] }) });
    setMsg([`「${s.name}」 블록 ${blocks.length}개를 첫 화면 맨 아래에 넣었습니다. 저장·게시는 평소처럼 위 단추로 해 주세요.`, ...notes].join(" "));
  };

  const remove = async (s: MySection) => {
    const id = req.current; // 지우기는 목록을 새로 받지 않으므로 지금 창(요청 번호)이 그대로일 때만 목록에서 뺀다
    setBusy(true);
    try {
      const r = await safe(() => deleteMySectionAction(s.id));
      if (!latest(id)) return;
      if (!r.ok) return setMsg(r.error);
      setList((l) => (l ?? []).filter((x) => x.id !== s.id));
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const label = (b: Block) => BLOCK_DEFS[b.type]?.label ?? b.type;
  const title = (b: Block) => {
    const s = b.settings as unknown as Record<string, unknown>;
    return typeof s.title === "string" && s.title ? s.title : typeof s.headline === "string" ? s.headline : "";
  };

  return (
    <>
      <button type="button" onClick={openSave} className="rounded border bg-white px-3 py-1.5 text-sm" data-my-section-save>💾 내 섹션 저장</button>
      <button type="button" onClick={openInsert} className="rounded border bg-white px-3 py-1.5 text-sm" data-my-section-insert>📥 내 섹션 넣기</button>

      {mode && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 text-left shadow-xl" role="dialog" aria-label={mode === "save" ? "내 섹션 저장" : "내 섹션 넣기"}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">{mode === "save" ? "💾 내 섹션으로 저장" : "📥 내 섹션 넣기"}</h2>
              <button type="button" onClick={close} className="text-sm text-gray-500">닫기 ✕</button>
            </div>

            {mode === "save" ? (
              <>
                <p className="mb-2 text-xs text-gray-500">저장할 블록을 고르세요(최대 {MAX_SECTION_BLOCKS}개). 내 계정에 저장되어, 내가 운영하는 다른 몰에서도 넣을 수 있습니다.</p>
                <ul className="mb-3 space-y-1">
                  {current.map((b, i) => (
                    <li key={`${b.id}-${i}`}>
                      <label className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                        <input type="checkbox" checked={picked.has(i)} onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(i); else n.delete(i); return n; })} />
                        <span className="font-medium">{label(b)}</span>
                        <span className="truncate text-gray-500">{title(b)}</span>
                      </label>
                    </li>
                  ))}
                  {!current.length && <li className="text-sm text-gray-500">첫 화면에 블록이 없습니다.</li>}
                </ul>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="섹션 이름(예: 명절 세일 묶음)" className="mb-3 w-full rounded border px-3 py-2 text-sm" />
                <button type="button" disabled={busy || !picked.size || !name.trim() || picked.size > MAX_SECTION_BLOCKS} onClick={save} className="w-full rounded bg-gray-900 py-2 text-sm text-white disabled:opacity-40">
                  {busy ? "저장 중..." : `블록 ${picked.size}개 저장`}
                </button>
              </>
            ) : (
              <>
                {list === null && !msg && <p className="text-sm text-gray-500">불러오는 중...</p>}
                {list && !list.length && <p className="text-sm text-gray-500">저장한 섹션이 없습니다. 「내 섹션 저장」으로 먼저 만들어 주세요.</p>}
                <ul className="space-y-2">
                  {(list ?? []).map((s) => (
                    <li key={s.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-gray-500">블록 {s.blocks.length}개 · {new Date(s.created_at).toLocaleDateString("ko-KR")}{s.source_store_id !== storeId ? " · 다른 몰에서 만듦" : ""}</p>
                      </div>
                      <button type="button" onClick={() => insert(s)} className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white">넣기</button>
                      <button type="button" disabled={busy} onClick={() => remove(s)} className="rounded border px-2 py-1.5 text-xs text-red-600 disabled:opacity-40">지우기</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {msg && <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
