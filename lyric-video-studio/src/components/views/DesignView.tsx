"use client";
import Link from "next/link";
import { useStudio } from "@/components/studio/StudioContext";
import { Preview, StudioBar, Transport } from "@/components/studio/parts";
import { PresetThumb } from "@/components/studio/PresetThumb";
import { FONT_IDS, FONTS, HIGHLIGHTS, presetsFor, SPECTRUMS, type Aspect, type Design } from "@/lib/design";
import { allSynced } from "@/lib/lyrics";

function Chips<T extends string | number>({ value, items, onPick }: { value: T; items: { id: T; label: string; hint?: string }[]; onPick: (v: T) => void }) {
  return <div className="chips">{items.map((it) => <button key={String(it.id)} type="button" title={it.hint} className={`chip ${value === it.id ? "on" : ""}`} onClick={() => onPick(it.id)}>{it.label}</button>)}</div>;
}
function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}

export function DesignView() {
  const s = useStudio(), d = s.design;
  const set = (patch: Partial<Design>) => s.setDesign(patch);
  const switchAspect = (a: Aspect) => { if (a !== d.aspect) s.applyPreset(presetsFor(a)[0]); };
  return (
    <div className="stack">
      <StudioBar />
      <div className="page-heading"><p className="eyebrow">STEP 3</p><h1>🎨 디자인</h1><p>미리보기는 실제 MP4와 같은 방법으로 그려집니다. 보이는 그대로 파일이 만들어집니다.</p></div>
      {!allSynced(s.lines) && s.lines.length > 0 && <div className="notice warning">시간이 없는 줄이 있습니다. 그 줄은 영상에 나오지 않습니다. <Link href="/sync" className="subtle-link">가사 싱크에서 맞추기</Link></div>}
      <div className="atelier">
        <div className="stage card">
          <Preview />
          <Transport />
        </div>
        <aside className="stack design-panel">
          <section className="card">
            <div className="panel-label">화면 모양</div>
            <div className="tabs">
              <button type="button" className={d.aspect === "landscape" ? "on" : ""} onClick={() => switchAspect("landscape")}>🖥️ 가로 16:9 (유튜브)</button>
              <button type="button" className={d.aspect === "portrait" ? "on" : ""} onClick={() => switchAspect("portrait")}>📱 세로 9:16 (쇼츠·릴스)</button>
            </div>
            <div className="panel-label" style={{ marginTop: 14 }}>프리셋</div>
            <div className="preset-grid">
              {presetsFor(d.aspect).map((p) => (
                <button key={p.id} type="button" className={`preset ${d.presetId === p.id ? "on" : ""}`} onClick={() => s.applyPreset(p)} aria-pressed={d.presetId === p.id}>
                  <PresetThumb preset={p} />
                  <strong>{p.name}</strong>
                  <small>{p.desc}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="card stack">
            <div><div className="panel-label">배치</div><Chips value={d.layout} onPick={(v) => set({ layout: v })} items={[{ id: "panel", label: "커버 + 가사" }, { id: "center", label: "가사 가운데" }]} /></div>
            <div><div className="panel-label">현재 줄 강조</div><Chips value={d.highlight} onPick={(v) => set({ highlight: v })} items={HIGHLIGHTS} /></div>
            <div className="field-grid two">
              <label>서체<select value={d.font} onChange={(e) => set({ font: e.target.value as Design["font"] })}>{FONT_IDS.map((f) => <option key={f} value={f}>{FONTS[f].label}</option>)}</select></label>
              <label>정렬<select value={d.align} onChange={(e) => set({ align: e.target.value as Design["align"] })}><option value="left">왼쪽</option><option value="center">가운데</option></select></label>
              <label>앞뒤로 보일 줄<select value={d.context} onChange={(e) => set({ context: Number(e.target.value) })}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? "지금 줄만" : `${n}줄씩`}</option>)}</select></label>
              <label>가사 크기 {Math.round(d.size * 100)}%<input type="range" min={0.7} max={1.4} step={0.05} value={d.size} onChange={(e) => set({ size: Number(e.target.value) })} /></label>
            </div>
          </section>
          <section className="card stack">
            <div className="panel-label">색</div>
            <div className="color-grid">
              <label>글자<input type="color" value={d.text} onChange={(e) => set({ text: e.target.value })} /></label>
              <label>강조<input type="color" value={d.accent} onChange={(e) => set({ accent: e.target.value })} /></label>
              <label>배경 1<input type="color" value={d.bg1} onChange={(e) => set({ bg1: e.target.value })} /></label>
              <label>배경 2<input type="color" value={d.bg2} onChange={(e) => set({ bg2: e.target.value })} /></label>
            </div>
            <div><div className="panel-label">소리 반응</div><Chips value={d.spectrum} onPick={(v) => set({ spectrum: v })} items={SPECTRUMS} /></div>
            <label>움직이는 빛 {Math.round(d.ambient * 100)}%<input type="range" min={0} max={1} step={0.05} value={d.ambient} onChange={(e) => set({ ambient: Number(e.target.value) })} /></label>
            <div className="toggles">
              <Toggle on={d.coverBackdrop} label="커버를 흐리게 배경으로" onChange={(v) => set({ coverBackdrop: v })} />
              <Toggle on={d.showTitle} label="제목·아티스트 표시" onChange={(v) => set({ showTitle: v })} />
              <Toggle on={d.progress} label="재생 막대 표시" onChange={(v) => set({ progress: v })} />
            </div>
          </section>
        </aside>
      </div>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <Link className="button" href="/sync">← 가사 싱크</Link>
        <Link className="button primary" href="/export">다음: MP4 내보내기 →</Link>
      </div>
    </div>
  );
}
