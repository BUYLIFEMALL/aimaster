"use client";
import { ERAS, MARKETS, type Brief } from "@/lib/studio/config";
import {
  LIBRARY,
  ERA_LABELS,
  filterLibrary,
  applyPreset,
} from "@/lib/studio/catalog";

export function AlbumReferencePicker({
  brief,
  onChange,
}: {
  brief: Brief;
  onChange: (brief: Brief) => void;
}) {
  const filter = {
    market: brief.market === "장르·월드" ? "" : brief.market,
    era: brief.era === "global" ? "" : brief.era,
    group: brief.styleGroup,
    type: "",
    query: "",
    bpm: "",
  };
  const pool = filterLibrary({ ...filter, group: "" }).filter(
    (p) => p.type !== "dance",
  );
  const groups = [...new Set(pool.map((p) => p.group))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
  const matches = filterLibrary(filter).filter((p) => p.type !== "dance");
  const selected = LIBRARY.find((p) => p.id === brief.presetId);
  // Imported builder references stay visible even when they are dance presets.
  const options =
    selected && !matches.some((p) => p.id === selected.id)
      ? [selected, ...matches]
      : matches;
  function change(key: "market" | "era" | "styleGroup", value: string) {
    onChange({
      ...brief,
      [key]: value,
      ...(key !== "styleGroup" ? { styleGroup: "" } : {}),
      presetId: "",
      presetVoice: "자연스러운 보컬",
      style: "",
      locked: false,
      generateStyle: true,
      genre: "auto",
      instruments: "auto",
    });
  }
  return (
    <div className="two-columns album-reference-grid">
      <label>
        분류
        <select
          aria-label="앨범 분류"
          value={brief.market}
          onChange={(e) => change("market", e.target.value)}
        >
          {MARKETS.map((m) => (
            <option key={m} value={m}>
              {m === "장르·월드" ? "전체" : m}
            </option>
          ))}
        </select>
      </label>
      <label>
        시대 / 톤
        <select
          aria-label="앨범 시대"
          value={brief.era}
          onChange={(e) => change("era", e.target.value)}
        >
          <option value="global">시대 선택 (선택)</option>
          {ERAS.filter((e) => e !== "global").map((e) => (
            <option key={e} value={e}>
              {ERA_LABELS[e] || e}
            </option>
          ))}
        </select>
      </label>
      <label>
        스타일 그룹 (옵션)
        <select
          aria-label="앨범 스타일 그룹"
          value={brief.styleGroup}
          onChange={(e) => change("styleGroup", e.target.value)}
        >
          <option value="">자동 (앨범 컨셉에서 추론)</option>
          {brief.styleGroup && !groups.includes(brief.styleGroup) && (
            <option>{brief.styleGroup}</option>
          )}
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        레퍼런스 프리셋 (선택)
        <select
          aria-label="앨범 참고 프리셋"
          value={brief.presetId}
          onChange={(e) => {
            const preset = options.find((p) => p.id === e.target.value);
            if (preset)
              onChange({ ...applyPreset(brief, preset), mood: brief.mood });
            else change("styleGroup", brief.styleGroup);
          }}
        >
          <option value="">없음</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.bpm} BPM
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
