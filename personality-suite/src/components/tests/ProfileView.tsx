"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { testTitle } from "@/lib/tests/registry";
import type { StoredProfile } from "@/lib/results";

export function ProfileView({ initial, doneCount }: { initial: StoredProfile | null; doneCount: number }) {
  const [stored, setStored] = useState<StoredProfile | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);

  async function build() {
    setBusy(true); setError(""); setNeedKey(false);
    try {
      const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNeedKey(!!data.needKey); throw new Error(data.error || "종합 프로필을 만들지 못했습니다."); }
      setStored(data.stored as StoredProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "종합 프로필을 만들지 못했습니다.");
    } finally { setBusy(false); }
  }

  const p = stored?.profile;
  return (
    <div className="stack">
      <section className="card">
        <div className="head-row">
          <div>
            <h2>종합 프로필 만들기</h2>
            <p className="muted">서로 다른 검사 결과를 하나로 묶어 공통 주제와 달라 보이는 지점을 해석합니다. 현재 마친 검사 {doneCount}종 (2종 이상 필요).</p>
          </div>
          <button type="button" className="primary" onClick={build} disabled={busy || doneCount < 2}>
            {busy ? <><Loader2 size={14} className="ls-spin" />만드는 중</> : <><Sparkles size={14} />{p ? "다시 만들기" : "종합 프로필 만들기"}</>}
          </button>
        </div>
        {doneCount < 2 && <p className="notice" style={{ marginTop: 12 }}>검사를 2종 이상 마친 뒤 만들 수 있습니다. <a className="subtle-link" href="/dashboard">검사하러 가기</a></p>}
        {error && <p role="alert" className="error" style={{ marginTop: 10 }}>{error} {needKey && <a className="subtle-link" href="/settings">API키등록·플랫폼연동으로 이동</a>}</p>}
      </section>

      {p && stored && (
        <>
          <section className="card result-head">
            <p className="eyebrow">종합 프로필</p>
            <h1>{p.headline}</h1>
            <p className="muted">{new Date(stored.updatedAt).toLocaleString("ko-KR")} 생성 · 재료: {stored.basedOn.map((b) => `${testTitle(b.testId)}(${b.headline})`).join(", ")}</p>
          </section>
          <section className="card"><h2>공통으로 보이는 주제</h2><ul className="gd-list">{p.commonThemes.map((s, i) => <li key={i}>{s}</li>)}</ul></section>
          {p.tensions.length > 0 && <section className="card"><h2>상황에 따라 달라 보이는 지점</h2><ul className="gd-list">{p.tensions.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
          {p.strengths.length > 0 && <section className="card"><h2>종합 강점</h2><ul className="gd-list">{p.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
          {p.growthPlan.length > 0 && (
            <section className="card">
              <h2>앞으로 2주 실천 계획</h2>
              <ol className="gd-steps" style={{ marginTop: 12 }}>
                {p.growthPlan.map((a, i) => <li key={i} className="gd-step"><span className="gd-num">{i + 1}</span><div><strong>{a.title}</strong><p>{a.detail}</p></div></li>)}
              </ol>
            </section>
          )}
          {p.caution && <div className="notice">{p.caution}</div>}
        </>
      )}
    </div>
  );
}
