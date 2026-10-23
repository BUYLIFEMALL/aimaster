"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { getDefaultPersonas, getPresets, isDefaultPersonaId } from "@/lib/persona/data";
import { DEFAULT_VALUES, EQ_KEYS, EQ_LABELS, LIMITS, type EqKey, type EqValues, type Persona } from "@/lib/persona/types";

export type StyleScope = "selection" | "all";
export interface StyleRunResult { text?: string; error?: string; needKey?: boolean }

const EQ_HINT: Record<EqKey, [string, string]> = {
  creativity: ["평범하게", "비유·묘사 풍부"],
  clarity: ["여러 겹·함축", "쉽고 정확하게"],
  emotionalDepth: ["객관적", "감정 깊게"],
  length: ["짧게(0.3배)", "길게(2배)"],
  professionalism: ["구어체", "격식·전문"],
};

const blankPersona = (): Persona => ({
  id: `custom-${Date.now().toString(36)}`,
  name: "", role: "", description: "", avatar: "👤",
  context: { lore: "", voice: "", style: "" },
  values: { ...DEFAULT_VALUES },
});

/**
 * 「🎚️ 문체 바꾸기」 사이드 패널(2026-10-21 병합 B — 옛 페르소나 문체 자동화의 슬라이더·프리셋·페르소나).
 * 본문을 읽고 바꾸는 일은 에디터가 하고(onRun/onApply), 이 패널은 설정·미리보기만 맡는다.
 */
export function StylePanel({
  selectionChars, totalChars, onRun, onApply, onClose,
}: {
  selectionChars: number;
  totalChars: number;
  onRun: (scope: StyleScope, values: EqValues, persona: Persona | null) => Promise<StyleRunResult>;
  onApply: () => boolean;
  onClose: () => void;
}) {
  const presets = useMemo(() => getPresets("ko"), []);
  const [scope, setScope] = useState<StyleScope>(selectionChars > 0 ? "selection" : "all");
  const [values, setValues] = useState<EqValues>({ ...DEFAULT_VALUES });
  const [presetId, setPresetId] = useState<string | null>(null);
  const [mine, setMine] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Persona | null>(null);
  const [busy, setBusy] = useState<"" | "run" | "gen" | "save">("");
  const [preview, setPreview] = useState("");
  const [msg, setMsg] = useState<{ text: string; needKey?: boolean } | null>(null);

  useEffect(() => { if (selectionChars === 0 && scope === "selection") setScope("all"); }, [selectionChars, scope]);
  useEffect(() => {
    void fetch("/api/personas").then((r) => r.json()).then((d) => { if (Array.isArray(d.personas)) setMine(d.personas); }).catch(() => {});
  }, []);

  // 기본 페르소나 10명(내가 고친 값이 있으면 그 값) + 직접 만든 페르소나
  const personas = useMemo(() => {
    const saved = new Map(mine.map((p) => [p.id, p]));
    return [...getDefaultPersonas("ko").map((p) => saved.get(p.id) ?? p), ...mine.filter((p) => !isDefaultPersonaId(p.id))];
  }, [mine]);
  const persona = personas.find((p) => p.id === personaId) ?? null;

  function pickPersona(p: Persona | null) {
    setPersonaId(p?.id ?? null);
    if (p) { setValues({ ...p.values }); setPresetId(null); }
  }
  function setOne(k: EqKey, v: number) { setValues((cur) => ({ ...cur, [k]: v })); setPresetId(null); }

  async function run() {
    setBusy("run"); setMsg(null); setPreview("");
    const r = await onRun(scope, values, persona);
    setBusy("");
    if (r.error) setMsg({ text: r.error, needKey: r.needKey });
    else setPreview(r.text ?? "");
  }
  function apply() {
    if (onApply()) { setPreview(""); setMsg({ text: "본문에 적용했습니다. 마음에 들지 않으면 Ctrl+Z로 되돌릴 수 있습니다." }); }
    else setMsg({ text: "그 사이 본문이 바뀌어 적용하지 못했습니다. 다시 바꿔 주세요." });
  }

  async function fillWithAi() {
    if (!draft?.name.trim() || !draft.role.trim()) { setMsg({ text: "이름과 역할을 먼저 입력해 주세요." }); return; }
    setBusy("gen"); setMsg(null);
    try {
      const res = await fetch("/api/persona-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name, role: draft.role }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.persona) { setMsg({ text: d.error ?? "AI로 채우지 못했습니다.", needKey: !!d.needKey }); return; }
      const g = d.persona as { description: string; lore: string; voice: string; style: string; values: EqValues };
      setDraft((cur) => cur && { ...cur, description: g.description, context: { lore: g.lore, voice: g.voice, style: g.style }, values: g.values });
    } catch { setMsg({ text: "서버에 연결하지 못했습니다." }); } finally { setBusy(""); }
  }
  async function saveDraft() {
    if (!draft?.name.trim() || !draft.role.trim()) { setMsg({ text: "이름과 역할은 꼭 입력해 주세요." }); return; }
    setBusy("save"); setMsg(null);
    try {
      const res = await fetch("/api/personas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: draft }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: d.error ?? "저장하지 못했습니다." }); return; }
      setMine((cur) => [...cur.filter((p) => p.id !== draft.id), draft]);
      pickPersona(draft);
      setDraft(null);
    } catch { setMsg({ text: "서버에 연결하지 못했습니다." }); } finally { setBusy(""); }
  }
  async function removePersona(p: Persona) {
    if (!window.confirm(isDefaultPersonaId(p.id) ? `「${p.name}」을 처음 설정으로 되돌릴까요?` : `「${p.name}」 페르소나를 삭제할까요?`)) return;
    const res = await fetch(`/api/personas?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
    if (!res.ok) { setMsg({ text: "삭제하지 못했습니다." }); return; }
    setMine((cur) => cur.filter((x) => x.id !== p.id));
    if (personaId === p.id) setPersonaId(null);
  }

  const targetChars = scope === "selection" ? selectionChars : totalChars;
  const tooLong = targetChars > LIMITS.text;

  return (
    <aside className="we-panel we-style" aria-label="문체 바꾸기">
      <div className="we-panel-head">
        <h2>🎚️ 문체 바꾸기</h2>
        <button type="button" aria-label="문체 패널 닫기" onClick={onClose}><X size={14} /></button>
      </div>
      <p className="muted we-panel-note">슬라이더·프리셋·페르소나로 말투를 정하고 바꿉니다. 결과는 미리 보고 나서 본문에 적용합니다.</p>

      <h3 className="we-style-h">1. 바꿀 범위</h3>
      <div className="we-chips" role="group" aria-label="바꿀 범위">
        <button type="button" aria-pressed={scope === "selection"} disabled={selectionChars === 0} onClick={() => setScope("selection")}>
          선택한 부분{selectionChars ? ` ${selectionChars.toLocaleString("ko-KR")}자` : "(본문에서 드래그)"}
        </button>
        <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>글 전체 {totalChars.toLocaleString("ko-KR")}자</button>
      </div>

      <h3 className="we-style-h">2. 페르소나(선택)</h3>
      <div className="we-persona-grid">
        <button type="button" aria-pressed={personaId === null} onClick={() => pickPersona(null)}><span>✍️</span>없음</button>
        {personas.map((p) => (
          <button key={p.id} type="button" aria-pressed={personaId === p.id} title={`${p.role} · ${p.description}`} onClick={() => pickPersona(p)}>
            <span>{p.avatar}</span>{p.name}
          </button>
        ))}
        <button type="button" className="we-persona-add" onClick={() => setDraft(blankPersona())}><Plus size={13} />나만의</button>
      </div>
      {persona && (
        <div className="we-persona-info">
          <p><b>{persona.avatar} {persona.name}</b> · {persona.role}</p>
          <p className="muted">{persona.context.voice || persona.description}</p>
          {(mine.some((m) => m.id === persona.id)) && (
            <button type="button" onClick={() => void removePersona(persona)}><Trash2 size={12} />{isDefaultPersonaId(persona.id) ? "처음 설정으로" : "삭제"}</button>
          )}
        </div>
      )}
      {draft && (
        <div className="we-persona-form">
          <div className="we-persona-row">
            <input aria-label="아이콘" value={draft.avatar} maxLength={4} onChange={(e) => setDraft({ ...draft, avatar: e.target.value })} style={{ width: 52 }} />
            <input aria-label="이름" placeholder="이름 (예: 김 과장)" value={draft.name} maxLength={LIMITS.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <input aria-label="역할" placeholder="역할 (예: 친절한 고객센터 상담원)" value={draft.role} maxLength={LIMITS.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <button type="button" disabled={busy !== ""} onClick={() => void fillWithAi()}>
            {busy === "gen" ? <Loader2 size={13} className="we-spin" /> : <Sparkles size={13} />}AI로 말투 채우기
          </button>
          {(["lore", "voice", "style"] as const).map((k) => (
            <textarea key={k} aria-label={{ lore: "배경", voice: "말투·성격", style: "문체" }[k]} rows={2} maxLength={LIMITS.field}
              placeholder={{ lore: "배경 (예: 10년 차 상담원)", voice: "말투·성격 (예: 차분하고 공감을 먼저 표현)", style: "문체 (예: 짧은 문장, 존댓말)" }[k]}
              value={draft.context[k]} onChange={(e) => setDraft({ ...draft, context: { ...draft.context, [k]: e.target.value } })} />
          ))}
          <div className="actions">
            <button type="button" className="primary" disabled={busy !== ""} onClick={() => void saveDraft()}>{busy === "save" ? "저장 중…" : "저장하고 쓰기"}</button>
            <button type="button" onClick={() => setDraft(null)}>취소</button>
          </div>
        </div>
      )}

      <h3 className="we-style-h">3. 프리셋</h3>
      <div className="we-chips" role="group" aria-label="프리셋">
        {presets.map((p) => (
          <button key={p.id} type="button" aria-pressed={presetId === p.id} title={p.description} onClick={() => { setValues({ ...p.values }); setPresetId(p.id); }}>{p.name}</button>
        ))}
      </div>

      <h3 className="we-style-h">4. 세부 조절</h3>
      <div className="we-eq">
        {EQ_KEYS.map((k) => (
          <label key={k}>
            <span className="we-eq-top"><b>{EQ_LABELS.ko[k]}</b><span>{values[k]}</span></span>
            <input type="range" min={0} max={100} value={values[k]} onChange={(e) => setOne(k, Number(e.target.value))} />
            <span className="we-eq-ends muted"><span>{EQ_HINT[k][0]}</span><span>{EQ_HINT[k][1]}</span></span>
          </label>
        ))}
      </div>

      <div className="actions we-style-run">
        <button type="button" className="primary" disabled={busy !== "" || targetChars === 0 || tooLong} onClick={() => void run()}>
          {busy === "run" ? <Loader2 size={13} className="we-spin" /> : <Sparkles size={13} />}{busy === "run" ? "바꾸는 중…" : "문체 바꾸기"}
        </button>
        <button type="button" onClick={() => { setValues({ ...DEFAULT_VALUES }); setPresetId(null); }}>값 초기화</button>
      </div>
      {tooLong && <p className="muted we-panel-note">한 번에 {LIMITS.text.toLocaleString("ko-KR")}자까지 바꿀 수 있습니다. 부분을 드래그해 나눠서 바꿔 주세요.</p>}
      {msg && (
        <p className="notice" role="status">{msg.text}{msg.needKey && <> <a href="/settings">키 등록하러 가기</a></>}</p>
      )}
      {preview && (
        <div className="we-style-preview">
          <p className="we-style-h">미리보기</p>
          <div className="we-style-preview-text">{preview}</div>
          <div className="actions">
            <button type="button" className="primary" onClick={apply}>본문에 적용</button>
            <button type="button" disabled={busy !== ""} onClick={() => void run()}>다시 바꾸기</button>
            <button type="button" onClick={() => setPreview("")}>버리기</button>
          </div>
        </div>
      )}
    </aside>
  );
}
