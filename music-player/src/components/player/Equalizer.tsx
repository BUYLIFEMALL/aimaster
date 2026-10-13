"use client";
import { useState } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { EQ_FREQUENCIES, EQ_MAX, EQ_MIN, EQ_PRESETS, clampGain, hzLabel } from "@/lib/player/eq";

interface Props {
  gains: number[];
  preamp: number;
  customPresets: { name: string; gains: number[] }[];
  onGains: (g: number[]) => void;
  onPreamp: (db: number) => void;
  onCustomPresets: (p: { name: string; gains: number[] }[]) => void;
}

export function Equalizer({ gains, preamp, customPresets, onGains, onPreamp, onCustomPresets }: Props) {
  const [name, setName] = useState("");

  const setBand = (i: number, v: number) => {
    const next = gains.slice();
    next[i] = clampGain(v);
    onGains(next);
  };

  const savePreset = () => {
    const n = name.trim().slice(0, 20);
    if (!n) return;
    const rest = customPresets.filter((p) => p.name !== n);
    onCustomPresets([...rest, { name: n, gains: gains.slice() }].slice(-12));
    setName("");
  };

  return (
    <section className="mp-eq" aria-label="그래픽 이퀄라이저">
      <div className="mp-eq-head">
        <h2>이퀄라이저</h2>
        <button type="button" onClick={() => { onGains(EQ_FREQUENCIES.map(() => 0)); onPreamp(0); }}><RotateCcw size={14} />초기화</button>
      </div>
      <div className="mp-eq-body">
        <div className="mp-eq-bands">
          <div className="mp-band">
            <span className="mp-band-val">{preamp.toFixed(1)}</span>
            <input type="range" className="mp-vslider" min={-12} max={12} step={0.5} value={preamp} onChange={(e) => onPreamp(Number(e.target.value))} aria-label="프리앰프(dB)" />
            <span className="mp-band-hz">프리앰프</span>
          </div>
          {EQ_FREQUENCIES.map((f, i) => (
            <div key={f} className="mp-band">
              <span className="mp-band-val">{gains[i].toFixed(1)}</span>
              <input
                type="range" className="mp-vslider" min={EQ_MIN} max={EQ_MAX} step={0.1} value={gains[i]}
                onChange={(e) => setBand(i, Number(e.target.value))} aria-label={`${hzLabel(f)}Hz 대역(dB)`}
              />
              <span className="mp-band-hz">{hzLabel(f)}</span>
            </div>
          ))}
        </div>
        <div className="mp-presets">
          <h3>프리셋</h3>
          <div className="mp-preset-list">
            {EQ_PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => onGains(p.gains.slice())}>{p.label}</button>
            ))}
          </div>
          {customPresets.length > 0 && <h3>내 프리셋</h3>}
          <div className="mp-preset-list">
            {customPresets.map((p) => (
              <span key={p.name} className="mp-custom">
                <button type="button" onClick={() => onGains(p.gains.slice())}>{p.name}</button>
                <button type="button" className="mp-x" aria-label={`${p.name} 삭제`} onClick={() => onCustomPresets(customPresets.filter((x) => x.name !== p.name))}><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
          <div className="mp-save-preset">
            <input type="text" value={name} maxLength={20} placeholder="현재 설정을 이름으로 저장" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") savePreset(); }} />
            <button type="button" disabled={!name.trim()} onClick={savePreset}><Save size={14} />저장</button>
          </div>
        </div>
      </div>
    </section>
  );
}
