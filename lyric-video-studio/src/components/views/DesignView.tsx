"use client";
import Link from "next/link";
import { useStudio } from "@/components/studio/StudioContext";
import { Preview, StudioBar, Transport } from "@/components/studio/parts";
import { PresetThumb } from "@/components/studio/PresetThumb";
import { PhotoPicker } from "@/components/studio/PhotoPicker";
import { useRef, useState } from "react";
import { FONT_IDS, FONTS, FRAMES, HIGHLIGHTS, LOGO_POSITIONS, presetsFor, ROMANS, SPECTRUMS, type Aspect, type Design } from "@/lib/design";
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
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoMsg, setLogoMsg] = useState("");
  const pickLogo = async (f: File) => { setLogoMsg(""); try { await s.loadLogo(f); } catch (e) { setLogoMsg(e instanceof Error ? e.message : "로고를 넣지 못했습니다."); } };
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
            <div>
              <div className="panel-label">배치</div><Chips value={d.layout} onPick={(v) => set({ layout: v })} items={[{ id: "panel", label: "커버 + 가사" }, { id: "center", label: "가사 가운데" }]} />
              {d.layout === "panel" && <div className="toggles" style={{ marginTop: 8 }}><Toggle on={d.vinyl} label="💿 커버 뒤 LP판 회전" onChange={(v) => set({ vinyl: v })} /></div>}
            </div>
            <div><div className="panel-label">현재 줄 강조</div><Chips value={d.highlight} onPick={(v) => set({ highlight: v })} items={HIGHLIGHTS} /></div>
            <div><div className="panel-label">노래방 로마자 발음 <span className="muted">(한글 가사 → saranghae)</span></div><Chips value={d.roman} onPick={(v) => set({ roman: v })} items={ROMANS} /></div>
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
          <section className="card stack">
            <div>
              <div className="panel-label">🏷️ 채널 로고 <span className="muted">(이 PC의 그림 — 서버에 올리지 않습니다)</span></div>
              <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => logoInput.current?.click()}>{s.logo ? "로고 바꾸기" : "로고 그림 넣기"}</button>
                {s.logo && <button type="button" onClick={() => s.clearLogo()}>로고 빼기</button>}
                <small className="muted">{s.logo ? `✓ ${s.logo.name}` : "PNG(투명 배경)·JPG·WebP, 5MB 이하"}</small>
                <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickLogo(f); e.target.value = ""; }} />
              </div>
              {logoMsg && <small>⚠️ {logoMsg}</small>}
              {s.logo && <>
                <div className="panel-label" style={{ marginTop: 10 }}>로고 위치</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 40px)", gap: 6 }}>
                  {LOGO_POSITIONS.map((p) => <button key={p.id} type="button" className={`chip ${d.logoPos === p.id ? "on" : ""}`} style={{ justifyContent: "center", padding: "6px 0" }} aria-pressed={d.logoPos === p.id} aria-label={`로고 위치 ${p.id + 1}`} onClick={() => set({ logoPos: p.id })}>{p.label}</button>)}
                </div>
                <div className="field-grid two" style={{ marginTop: 10 }}>
                  <label>로고 크기 {Math.round(d.logoSize * 100)}%<input type="range" min={0.05} max={0.3} step={0.01} value={d.logoSize} onChange={(e) => set({ logoSize: Number(e.target.value) })} /></label>
                  <label>로고 투명도 {Math.round(d.logoOpacity * 100)}%<input type="range" min={0.2} max={1} step={0.05} value={d.logoOpacity} onChange={(e) => set({ logoOpacity: Number(e.target.value) })} /></label>
                </div>
                <small className="muted">로고 그림은 저장되지 않습니다. 작업을 다시 열면 한 번 더 넣어 주세요(위치·크기는 저장됩니다).</small>
              </>}
            </div>
            <div>
              <div className="panel-label">🖼️ 프레임(테두리)</div><Chips value={d.frame} onPick={(v) => set({ frame: v })} items={FRAMES} />
              {d.frame !== "none" && <div className="field-grid two" style={{ marginTop: 10 }}>
                <label>선 색<input type="color" value={d.frameColor} onChange={(e) => set({ frameColor: e.target.value })} /></label>
                <label>선 두께 {d.frameWidth}<input type="range" min={2} max={12} step={1} value={d.frameWidth} onChange={(e) => set({ frameWidth: Number(e.target.value) })} /></label>
              </div>}
            </div>
          </section>
          <PhotoPicker />
        </aside>
      </div>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <Link className="button" href="/sync">← 가사 싱크</Link>
        <Link className="button primary" href="/export">다음: MP4 내보내기 →</Link>
      </div>
    </div>
  );
}
