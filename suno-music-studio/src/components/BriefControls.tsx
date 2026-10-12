"use client";
import {
  ARRANGEMENTS,
  ARCS,
  VOICES,
  STRUCTURES,
  MODELS,
  TAGS,
  type Brief,
} from "@/lib/studio/config";
export function BriefControls({
  brief,
  onChange,
  busy,
  album = false,
}: {
  brief: Brief;
  onChange: (b: Brief) => void;
  busy: boolean;
  album?: boolean;
}) {
  function edit<K extends keyof Brief>(k: K, value: Brief[K]) {
    onChange({ ...brief, [k]: value });
  }
  return (
    <fieldset disabled={busy} className="brief-controls">
      <div className="two-columns">
        <label>
          AI 모델
          <select
            value={brief.model}
            onChange={(e) => {
              const model = MODELS.find((m) => m.id === e.target.value)!;
              onChange({ ...brief, model: model.id, provider: model.provider });
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          보컬
          <select
            disabled={brief.instrumental}
            value={brief.voice}
            onChange={(e) => edit("voice", e.target.value)}
          >
            {VOICES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        장르
        <input
          value={brief.genre}
          list="genre-tags"
          maxLength={180}
          onChange={(e) => edit("genre", e.target.value)}
        />
        <datalist id="genre-tags">
          {TAGS.genre.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </datalist>
      </label>
      <div className="two-columns">
        <label>
          분위기
          <input
            value={brief.mood}
            maxLength={180}
            onChange={(e) => edit("mood", e.target.value)}
          />
        </label>
        <label>
          BPM
          <input
            type="number"
            min={40}
            max={220}
            value={brief.bpm}
            onChange={(e) =>
              edit("bpm", Math.min(220, Math.max(40, Number(e.target.value))))
            }
          />
        </label>
      </div>
      <label>
        악기
        <input
          value={brief.instruments}
          maxLength={350}
          onChange={(e) => edit("instruments", e.target.value)}
        />
      </label>
      <label>
        곡 구조
        <select
          value={brief.structure}
          onChange={(e) => edit("structure", e.target.value)}
        >
          {STRUCTURES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={brief.instrumental}
          onChange={(e) => edit("instrumental", e.target.checked)}
        />
        보컬 없는 연주곡
      </label>
      <div className="faders">
        {(
          [
            {
              key: "englishPct",
              name: "가사 영문 비율",
              detail: `한국어 ${100 - brief.englishPct}% · 영어 ${brief.englishPct}%`,
            },
            {
              key: "rapPct",
              name: "랩 비율",
              detail: `노래 ${100 - brief.rapPct}% · 랩 ${brief.rapPct}%`,
            },
            {
              key: "metaphorPct",
              name: "비유 강도",
              detail: `${brief.metaphorPct}%`,
            },
          ] as const
        ).map((s) => (
          <label key={s.key}>
            {s.name}
            <span className="muted"> {s.detail}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={brief.instrumental}
              value={brief[s.key]}
              onChange={(e) => edit(s.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      {brief.rapPct === 100 && !brief.instrumental && (
        <p className="info">
          랩 100%는 훅까지 랩 구조로 요청합니다. 음악 생성 결과에서 창법이
          정확히 적용되는지는 Suno에서 확인하세요.
        </p>
      )}
      <label className="toggle">
        <input
          type="checkbox"
          checked={brief.cues}
          onChange={(e) => edit("cues", e.target.checked)}
        />
        가사 구간에 짧은 음악 지시 넣기
      </label>
      <details className="advanced-settings">
        <summary>코러스·편곡 세부 설정</summary>
        <label>
          편곡 방식
          <select
            value={brief.arrangement}
            onChange={(e) => edit("arrangement", e.target.value)}
          >
            {ARRANGEMENTS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={brief.harmony}
            disabled={brief.instrumental}
            onChange={(e) => edit("harmony", e.target.checked)}
          />
          화음·백킹 코러스
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={brief.callResponse}
            disabled={brief.instrumental}
            onChange={(e) => edit("callResponse", e.target.checked)}
          />
          콜 앤 리스폰스
        </label>
      </details>
      {album && (
        <div className="two-columns">
          <label>
            앨범 곡 수
            <select
              value={brief.count}
              onChange={(e) => edit("count", Number(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 3).map((n) => (
                <option key={n} value={n}>
                  {n}곡
                </option>
              ))}
            </select>
          </label>
          <label>
            앨범 흐름
            <select
              value={brief.arc}
              onChange={(e) => edit("arc", e.target.value)}
            >
              {ARCS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <label>
        제외 스타일
        <input
          value={brief.exclude}
          maxLength={500}
          onChange={(e) => edit("exclude", e.target.value)}
          placeholder="예: distorted vocals, heavy percussion"
        />
      </label>
      <label>
        기준 Style
        <textarea
          value={brief.style}
          maxLength={1000}
          rows={3}
          onChange={(e) => edit("style", e.target.value)}
          placeholder="프리셋을 선택하거나 직접 영문으로 작성하세요."
        />
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={brief.locked}
          onChange={(e) => edit("locked", e.target.checked)}
        />
        Style 잠금 — AI가 이 문구를 바꾸지 않게 유지
      </label>
    </fieldset>
  );
}
