"use client";
// v1.56 광고 고지·AI 제작 표기(MP4 만들기 전) + 게시 전 확인 체크 목록(유튜브에 올리기 전). 판정은 src/lib/disclosure.ts.
import { AD_KINDS, CHECKS, CHECK_KEYS, CUSTOM_MAX, adBand, aiBand, aiMarkLocked, normalizeDisclosure, type AdKind, type CheckKey, type Disclosure } from "@/lib/disclosure";
import type { ShortsScript } from "@/lib/script";

export function DisclosureCard({ script, onChange }: { script: ShortsScript; onChange: (patch: Partial<Disclosure>) => void }) {
  const d = normalizeDisclosure(script); const locked = aiMarkLocked(script);
  const band = adBand(script), ai = aiBand(script);
  return (
    <section className="card stack">
      <h2>📢 광고·AI 표시</h2>
      <p className="muted">제휴 링크·협찬 영상은 「광고」임을 영상과 설명란에 밝혀야 합니다(공정위 추천·보증 심사지침). 켜면 영상 처음부터 끝까지 위쪽에 띠가 보이고, 유튜브 설명란 맨 첫 줄에도 같은 고지가 들어갑니다.</p>
      <div className="chips">
        {(Object.keys(AD_KINDS) as AdKind[]).map((k) => <button key={k} type="button" className={`chip ${d.ad === k ? "on" : ""}`} onClick={() => onChange({ ad: k })}>{AD_KINDS[k].label}</button>)}
      </div>
      {d.ad === "custom" && <label>띠에 넣을 문구 <small className="muted">(앞에 「광고 ·」가 붙습니다, {CUSTOM_MAX}자까지)</small><input value={d.custom ?? ""} maxLength={CUSTOM_MAX} placeholder="예: 브랜드로부터 원고료를 받았습니다" onChange={(e) => onChange({ custom: e.target.value })} /></label>}
      {script.product?.url && d.ad === "off" && <small style={{ color: "var(--danger, #dc2626)" }}>⚠️ 상품 주소가 있는 영상입니다. 제휴 링크라면 광고 표시를 켜 주세요.</small>}
      <label className="row" style={{ gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={d.aiMark || locked} disabled={locked} onChange={(e) => onChange({ aiMark: e.target.checked })} style={{ width: "auto" }} />
        「AI로 만든 영상」 표기 넣기{locked && <small className="muted"> — AI 음성을 쓴 영상은 끌 수 없습니다</small>}
      </label>
      <small className="muted">영상에 들어갈 표시: {band || ai ? [band && `「${band}」`, ai && `「${ai}」`].filter(Boolean).join(" + ") : "없음"}. AI 표기를 켜면 유튜브에도 「합성 콘텐츠」로 함께 알립니다. 바꾼 뒤에는 ④에서 MP4를 다시 만들어 주세요.</small>
    </section>
  );
}

export function PrepublishChecks({ script, onChange }: { script: ShortsScript; onChange: (checked: Partial<Record<CheckKey, boolean>>) => void }) {
  const c = normalizeDisclosure(script).checked ?? {};
  return (
    <div className="stack" style={{ gap: 6, padding: 12, border: "1px solid var(--line)", borderRadius: 12 }}>
      <strong>✅ 게시 전 확인 <small className="muted">(4개를 모두 체크해야 올릴 수 있습니다)</small></strong>
      {CHECK_KEYS.map((k) => <label key={k} className="row" style={{ gap: 8, alignItems: "center" }}><input type="checkbox" checked={c[k] === true} onChange={(e) => onChange({ ...c, [k]: e.target.checked })} style={{ width: "auto" }} />{CHECKS[k]}</label>)}
      <small className="muted">유튜브의 「유료 프로모션 포함」 표시는 업로드할 때 자동으로 켤 수 없습니다. 광고 영상이면 올린 뒤 YouTube Studio 「세부정보」에서 직접 켜 주세요.</small>
    </div>
  );
}
