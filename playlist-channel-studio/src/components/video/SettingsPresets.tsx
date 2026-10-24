"use client";

// P-5(2026-10-24) 「내 설정」 — 장르 시작 프리셋 · 이름 붙여 저장/적용/삭제 · 파일 내보내기/가져오기 · 처음 열 때 쓸 설정
import { useEffect, useRef, useState } from "react";
import type { StudioSettings } from "@/types/playlist";
import {
  GENRE_PRESETS,
  deletePreset,
  exportSettingsFile,
  importSettingsFile,
  listPresets,
  loadStartSettings,
  savePreset,
  saveStartSettings,
  type SavedPreset,
} from "@/lib/settings-store";

const BTN = "py-1.5 px-2 text-[11px] font-bold rounded-lg border bg-[#212121] text-[#aaaaaa] border-[#272727] hover:text-white disabled:opacity-40";

export function SettingsPresets({ userId, settings, setSettings }: { userId?: string | null; settings: StudioSettings; setSettings: React.Dispatch<React.SetStateAction<StudioSettings>> }) {
  const [saved, setSaved] = useState<SavedPreset[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [hasStart, setHasStart] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaved(listPresets(userId));
    setHasStart(!!loadStartSettings(userId));
  }, [userId]);

  const flash = (msg: string) => { setNote(msg); setTimeout(() => setNote(""), 2500); };
  const apply = (patch: Partial<StudioSettings>, label: string) => { setSettings((p) => ({ ...p, ...patch })); flash(`「${label}」을(를) 적용했습니다.`); };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-[#aaaaaa]">내 설정</h4>
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-[#777777]">장르로 시작하기</span>
        <div className="grid grid-cols-3 gap-1.5">
          {GENRE_PRESETS.map((g) => (
            <button key={g.id} onClick={() => apply(g.patch, g.label)} className={BTN} title={`${g.label} 분위기로 배경·스펙트럼·효과·곡 제목을 한 번에 바꿉니다`}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="설정 이름(예: 새벽 로파이)" className="min-w-0 flex-1 rounded-lg border border-[#272727] bg-[#121212] px-2 py-1.5 text-[11px] text-white placeholder:text-[#555]" />
        <button
          className={BTN}
          disabled={!name.trim()}
          onClick={() => {
            if (savePreset(userId, name, settings)) { setSaved(listPresets(userId)); flash(`「${name.trim()}」으로 저장했습니다.`); setName(""); }
            else flash("이 브라우저에 저장하지 못했습니다(사생활 보호 창일 수 있음). 「파일로 내보내기」를 써 주세요.");
          }}
        >
          저장
        </button>
      </div>
      {saved.length > 0 && (
        <ul className="max-h-36 space-y-1 overflow-y-auto pr-1">
          {saved.map((p) => (
            <li key={p.name} className="flex items-center gap-1.5 rounded-lg border border-[#272727] bg-[#141414] px-2 py-1 text-[11px]">
              <span className="min-w-0 flex-1 truncate text-white" title={new Date(p.savedAt).toLocaleString("ko-KR")}>{p.name}</span>
              <button className="text-[#22d3ee] hover:underline" onClick={() => apply(p.settings, p.name)}>적용</button>
              <button className="text-[#aaaaaa] hover:underline" onClick={() => { if (savePreset(userId, p.name, settings)) { setSaved(listPresets(userId)); flash(`「${p.name}」을 지금 설정으로 덮어썼습니다.`); } }}>덮어쓰기</button>
              <button className="text-[#777777] hover:text-red-400" aria-label={`${p.name} 삭제`} onClick={() => { deletePreset(userId, p.name); setSaved(listPresets(userId)); }}>삭제</button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button className={BTN} onClick={() => exportSettingsFile(settings)}>파일로 내보내기</button>
        <button className={BTN} onClick={() => fileRef.current?.click()}>파일 가져오기</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const s = await importSettingsFile(f);
          if (s) apply(s, f.name.replace(/\.json$/i, "")); else flash("설정 파일을 읽지 못했습니다. 이 프로그램에서 내보낸 파일인지 확인해 주세요.");
        }} />
        <button className={BTN} onClick={() => { if (saveStartSettings(userId, settings)) { setHasStart(true); flash("다음에 열 때 지금 설정으로 시작합니다."); } }}>시작값으로 저장</button>
        <button className={BTN} disabled={!hasStart} onClick={() => { saveStartSettings(userId, null); setHasStart(false); flash("시작값을 기본으로 되돌렸습니다."); }}>시작값 지우기</button>
      </div>
      {note && <p role="status" className="text-[10px] text-[#22d3ee]">{note}</p>}
      <p className="text-[10px] text-[#777777] leading-relaxed">설정은 이 브라우저에만 저장됩니다(로고·스티커 그림은 저장하지 않음). 다른 PC에서 쓰려면 「파일로 내보내기」로 옮기세요.</p>
    </div>
  );
}
