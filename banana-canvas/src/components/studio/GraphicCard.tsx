"use client";
// 2026-10-21 이미지 병합 B(v1.13): AI 올인원 그래픽 자동화의 템플릿 작업을 옮긴 카드. 프롬프트는 서버(/api/run kind=graphic)가 조립한다.
import { useMemo, useState } from "react";
import { FileText, Sparkles, Wand2 } from "lucide-react";
import type { Aspect } from "@/lib/bnc/types";
import { ASPECTS } from "@/lib/bnc/types";
import { GRAPHIC_LANGUAGES, GRAPHIC_STYLES, GRAPHIC_TEMPLATES, JOB_CATEGORIES } from "@/lib/bnc/graphicTemplates";
import type { GraphicPreset, Preset } from "@/lib/bnc/presets";
import { PresetRow } from "./PresetRow";

const TEXT_EXT = /\.(txt|md|json|csv)$/i;
const MAX_FILE_CHARS = 6000;

export function GraphicCard({ disabled, hasBase, onRun, onError, presets, onPresetsChange }: {
  disabled: boolean;
  hasBase: boolean;
  onRun: (extra: Record<string, unknown>) => void;
  onError: (r: { error: string; needKey: boolean }) => void;
  /** v1.19 내 작업 레시피 */
  presets: Preset[];
  onPresetsChange: (next: Preset[]) => void;
}) {
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [tplId, setTplId] = useState(GRAPHIC_TEMPLATES[0].id);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState("");
  const [langs, setLangs] = useState<string[]>(["한국어"]);
  const [extra, setExtra] = useState("");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [size, setSize] = useState<"1K" | "2K" | "4K">("1K");
  const [maintain, setMaintain] = useState(true);
  const [memo, setMemo] = useState("");
  const [docs, setDocs] = useState<{ name: string; text: string }[]>([]);
  const [filling, setFilling] = useState(false);

  const list = useMemo(() => GRAPHIC_TEMPLATES.filter((t) =>
    (cat === "ALL" || t.category === cat) && (!q.trim() || `${t.title} ${t.description}`.toLowerCase().includes(q.trim().toLowerCase()))), [cat, q]);
  const tpl = GRAPHIC_TEMPLATES.find((t) => t.id === tplId) ?? GRAPHIC_TEMPLATES[0];

  function pick(id: string) { setTplId(id); setFields({}); }
  // 지금 카드 값(실행할 때 보내는 값과 같은 모양) — 레시피 저장용
  const currentFields = () => Object.fromEntries(tpl.fields.map((f) => [f.id, fields[f.id] ?? (f.options ? f.defaultValue ?? f.options[0] : "")]));
  function applyPreset(g: GraphicPreset) {
    setCat("ALL"); setQ(""); // 고른 템플릿이 목록에 보이게 필터를 푼다
    setTplId(g.templateId); setFields(g.fields); setPreset(g.preset); setLangs(g.languages.length ? g.languages : ["한국어"]);
    setExtra(g.prompt); setAspect(g.aspect); setSize(g.imageSize); setMaintain(g.maintainSubject);
  }

  async function addDocs(files: FileList | null) {
    const picked = Array.from(files ?? []).filter((f) => TEXT_EXT.test(f.name)).slice(0, 3);
    if (!picked.length) { onError({ error: "기획서는 .txt·.md·.json·.csv 글자 파일만 읽을 수 있습니다(PDF는 글자를 복사해 메모에 붙여 넣어 주세요).", needKey: false }); return; }
    const read = await Promise.all(picked.map(async (f) => ({ name: f.name, text: (await f.text()).slice(0, MAX_FILE_CHARS) })));
    setDocs((d) => [...d, ...read].slice(0, 3));
  }

  async function autofill() {
    const content = [memo.trim() && `[메모]\n${memo.trim()}`, ...docs.map((d) => `[파일: ${d.name}]\n${d.text}`)].filter(Boolean).join("\n\n");
    if (!content) { onError({ error: "분석할 메모를 쓰거나 기획서 파일을 올려 주세요.", needKey: false }); return; }
    setFilling(true);
    try {
      const res = await fetch("/api/graphic-fill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: tpl.id, content }) });
      const data = (await res.json().catch(() => ({}))) as { values?: Record<string, string>; error?: string; needKey?: boolean };
      if (!res.ok) { onError({ error: data.error ?? "자동 입력에 실패했습니다.", needKey: !!data.needKey }); return; }
      const n = Object.keys(data.values ?? {}).length;
      if (!n) { onError({ error: "문서에서 채울 내용을 찾지 못했습니다. 메모를 조금 더 구체적으로 써 주세요.", needKey: false }); return; }
      setFields((f) => ({ ...f, ...data.values }));
    } catch { onError({ error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", needKey: false }); }
    finally { setFilling(false); }
  }

  return (
    <section className="card bc-card" id="card-graphic">
      <header><h2><span aria-hidden>📐</span> 템플릿 그래픽</h2><span className="bc-need">19개 직군 · {GRAPHIC_TEMPLATES.length}종</span></header>
      <p className="bc-hint">직군별 상업 템플릿을 고르고 빈칸만 채우면 배너·포스터·명함·UI 같은 그래픽을 만듭니다. 원본 이미지가 있으면 참고 이미지로 씁니다.</p>
      <div className="bc-row2">
        <label className="bc-field">직군
          <select value={cat} onChange={(e) => setCat(e.target.value)} disabled={disabled}>
            <option value="ALL">전체 직군</option>
            {Object.entries(JOB_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="bc-field">검색
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 메뉴판, 명함" disabled={disabled} />
        </label>
      </div>
      <label className="bc-field">템플릿 ({list.length}개)
        <select value={list.some((t) => t.id === tplId) ? tplId : ""} onChange={(e) => pick(e.target.value)} disabled={disabled}>
          {!list.some((t) => t.id === tplId) && <option value="">템플릿을 고르세요…</option>}
          {list.map((t) => <option key={t.id} value={t.id}>{JOB_CATEGORIES[t.category] ?? t.category} · {t.title}</option>)}
        </select>
      </label>
      <p className="bc-hint"><b>{tpl.title}</b> — {tpl.description}</p>
      {tpl.fields.map((f) => (
        <label key={f.id} className="bc-field">{f.label}
          {f.options ? (
            <select value={fields[f.id] ?? f.defaultValue ?? f.options[0]} onChange={(e) => setFields((v) => ({ ...v, [f.id]: e.target.value }))} disabled={disabled}>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={fields[f.id] ?? ""} maxLength={300} placeholder={f.placeholder || f.label} onChange={(e) => setFields((v) => ({ ...v, [f.id]: e.target.value }))} disabled={disabled} />
          )}
        </label>
      ))}
      <details className="bc-graphic-more">
        <summary><FileText size={13} /> 기획서·메모로 칸 자동 입력</summary>
        <textarea rows={3} value={memo} maxLength={4000} onChange={(e) => setMemo(e.target.value)} placeholder="행사 개요, 가게 소개, 기획 메모 등을 붙여 넣으세요" disabled={disabled || filling} aria-label="자동 입력용 메모" />
        <input type="file" multiple accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json" onChange={(e) => { void addDocs(e.target.files); e.target.value = ""; }} disabled={disabled || filling} aria-label="기획서 파일" />
        {docs.length > 0 && <small className="bc-hint">첨부: {docs.map((d) => d.name).join(", ")} <button type="button" onClick={() => setDocs([])}>비우기</button></small>}
        <button type="button" className="bc-suggest" disabled={disabled || filling} onClick={() => void autofill()}><Sparkles size={14} />{filling ? "분석 중…" : "AI로 칸 채우기"}</button>
      </details>
      <div className="bc-row2">
        <label className="bc-field">화풍
          <select value={preset} onChange={(e) => setPreset(e.target.value)} disabled={disabled}>
            <option value="">템플릿 기본({tpl.defaultStyle})</option>
            {GRAPHIC_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="bc-field">해상도 <small>(정밀 모델에서만 2K·4K)</small>
          <select value={size} onChange={(e) => setSize(e.target.value as "1K" | "2K" | "4K")} disabled={disabled}>
            <option value="1K">1K 표준</option><option value="2K">2K 고화질</option><option value="4K">4K 초고화질</option>
          </select>
        </label>
      </div>
      <div className="bc-seg" role="group" aria-label="이미지 안 글자 언어">
        {GRAPHIC_LANGUAGES.slice(0, 5).map((l) => (
          <button key={l} type="button" aria-pressed={langs.includes(l)} disabled={disabled}
            onClick={() => setLangs((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l].slice(-4)))}>{l}</button>
        ))}
      </div>
      <div className="bc-seg" role="group" aria-label="종횡비">
        {ASPECTS.map((a) => <button key={a} type="button" aria-pressed={aspect === a} onClick={() => setAspect(a)} disabled={disabled}>{a}</button>)}
      </div>
      {hasBase && (
        <div className="bc-seg" role="group" aria-label="참고 이미지 사용 방식">
          <button type="button" aria-pressed={maintain} onClick={() => setMaintain(true)} disabled={disabled}>👤 원본 인물·제품 유지</button>
          <button type="button" aria-pressed={!maintain} onClick={() => setMaintain(false)} disabled={disabled}>🎨 분위기만 참고</button>
        </div>
      )}
      <textarea rows={2} value={extra} maxLength={600} onChange={(e) => setExtra(e.target.value)} placeholder="추가 요청 (선택, 예: 상단에 「오픈 기념 20% 할인」 문구)" disabled={disabled} aria-label="템플릿 추가 요청" />
      <PresetRow kind="graphic" presets={presets} onChange={onPresetsChange} disabled={disabled} onError={(text) => onError({ error: text, needKey: false })}
        current={(): GraphicPreset => ({ templateId: tpl.id, fields: currentFields(), preset, languages: langs, prompt: extra, aspect, imageSize: size, maintainSubject: maintain })}
        onApply={(x) => applyPreset(x as GraphicPreset)} />
      <button type="button" className="primary" disabled={disabled}
        onClick={() => onRun({ templateId: tpl.id, fields: currentFields(), preset: preset || undefined, languages: langs, prompt: extra, aspect, imageSize: size, maintainSubject: maintain })}>
        <Wand2 size={14} />그래픽 만들기
      </button>
    </section>
  );
}
