"use client";

// AI 요약 엔진 고르기. 기준: realty-listing-alert/app/delivery/DeliveryClient.tsx AiEngineCard.
// 키는 공용 user_api_keys, 고른 엔진·모델은 회원 PC의 확장에 둔다(요약도 확장이 직접 부른다).
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAiKeyAction, saveAiKeyAction } from "@/lib/actions/channels";
import { AI_ENGINES, toAiProvider, type AiProvider } from "@/lib/aiEngines";
import { askExtension } from "@/lib/extensionBridge";
import { delBtn, editBtn, issueBtn, saveBtn, statusBadge } from "./setupStyles";

type Choice = { ok?: boolean; provider?: string; models?: Record<string, string>; error?: string };

function Row({ id, tail, selected, model, onSelect, onModel }: { id: AiProvider; tail: string | null; selected: boolean; model: string; onSelect: () => void; onModel: (m: string) => void }) {
  const router = useRouter();
  const engine = AI_ENGINES.find((e) => e.id === id)!;
  const has = !!tail;
  const [editing, setEditing] = useState(!has);
  const [key, setKey] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    setError("");
    const fd = new FormData();
    fd.set("provider", id);
    fd.set("aiKey", key.trim());
    const r = await saveAiKeyAction({}, fd);
    if (r.error) { setError(r.error); return; }
    setKey(""); setEditing(false); router.refresh();
  });
  const remove = () => start(async () => {
    const r = await deleteAiKeyAction(id);
    if (r.error) { setError(r.error); return; }
    setAskDelete(false); setEditing(true); router.refresh();
  });
  return (
    <div className={`border-t border-mx-border p-3 first:border-t-0 ${selected ? "border-l-4 border-l-amber-500 bg-orange-50" : "bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelect} aria-pressed={selected} title="눌러서 요약에 사용" className="min-h-[40px] rounded-lg px-2 text-sm font-bold text-mx-text hover:bg-mx-primary/10">{engine.icon} {engine.name}</button>
        <span className={statusBadge(has)}>{has ? "✓ 등록완료" : "미등록"}</span>
        <span className="min-w-0 flex-1 text-sm text-mx-muted"><b className="text-mx-text">{engine.role}</b> · {engine.roleText}</span>
        <a href={engine.keyUrl} target="_blank" rel="noopener noreferrer" className={issueBtn}>발급 ↗</a>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {editing ? (
          <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} aria-label={`${engine.name} API 키`} placeholder="API 키 붙여넣기" className="mx-input min-h-[40px] w-full py-2 text-sm md:w-64" />
        ) : (
          <span className="flex min-h-[40px] w-full items-center justify-between rounded-lg border border-mx-border bg-white px-3 text-sm md:w-64"><span aria-hidden>••••••••••••</span><b>{tail}</b></span>
        )}
        <select value={model} onChange={(e) => onModel(e.target.value)} aria-label={`${engine.name} 모델`} className="mx-input min-h-[40px] min-w-0 flex-1 basis-60 py-2 text-sm">
          {engine.models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {editing ? (
          <>
            <button type="button" onClick={save} disabled={busy || !key.trim()} className={saveBtn}>{busy ? "저장 중..." : "저장"}</button>
            {has && <button type="button" onClick={() => { setKey(""); setEditing(false); setError(""); }} className={editBtn}>취소</button>}
          </>
        ) : askDelete ? (
          <>
            <button type="button" onClick={remove} disabled={busy} className={delBtn}>정말 삭제</button>
            <button type="button" onClick={() => setAskDelete(false)} className={editBtn}>취소</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className={editBtn}>수정</button>
            <button type="button" onClick={() => setAskDelete(true)} className={delBtn}>삭제</button>
          </>
        )}
      </div>
      {askDelete && <p className="mt-2 text-xs text-mx-danger">이 키는 다른 AIMaster 프로그램에서도 함께 쓰여서, 삭제하면 그쪽에서도 지워집니다.</p>}
      {error && <p className="mt-2 text-sm text-mx-danger" role="alert">{error}</p>}
    </div>
  );
}

export function AiEngineCard({ email, tails }: { email: string; tails: Record<AiProvider, string | null> }) {
  const [provider, setProvider] = useState<AiProvider>("claude");
  const [models, setModels] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    void askExtension<Choice>("aiChoice", 2000, { email }).then((r) => {
      if (!alive) return;
      if (!r?.ok) { setNote(r?.error || "확장이 응답하지 않아 선택을 저장할 수 없습니다. chrome://extensions에서 ↻ 새로고침한 뒤 이 화면도 새로고침해 주세요."); return; }
      setProvider(toAiProvider(r.provider));
      setModels(r.models ?? {});
    });
    return () => { alive = false; };
  }, [email]);

  async function save(nextProvider: AiProvider, nextModels: Record<string, string>) {
    setProvider(nextProvider);
    setModels(nextModels);
    const r = await askExtension<Choice>("aiChoice", 2000, { email, set: { provider: nextProvider, models: nextModels } });
    setNote(r?.ok ? "" : r?.error || "확장이 응답하지 않아 저장하지 못했습니다. 확장을 새로고침한 뒤 이 화면도 새로고침해 주세요.");
  }

  return (
    <div>
      <p className="mb-3 text-sm text-mx-muted">엔진 이름을 누르면 그 줄이 요약에 쓰여요(색이 바뀐 줄). 키와 요금은 회원님 본인 계정 것이고, 다른 AIMaster 프로그램에 등록한 키를 그대로 씁니다.</p>
      <div className="overflow-hidden rounded-xl border border-mx-border">
        {AI_ENGINES.map((e) => (
          <Row
            key={e.id}
            id={e.id}
            tail={tails[e.id]}
            selected={provider === e.id}
            model={models[e.id] && e.models.some((m) => m.value === models[e.id]) ? models[e.id] : e.models[0].value}
            onSelect={() => save(e.id, models)}
            onModel={(m) => save(provider, { ...models, [e.id]: m })}
          />
        ))}
      </div>
      {note && <p className="mt-2 text-sm text-mx-danger" role="alert">{note}</p>}
    </div>
  );
}
