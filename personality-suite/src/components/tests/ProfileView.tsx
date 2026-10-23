"use client";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { testTitle } from "@/lib/tests/registry";
import { WEIGHT_LABELS, type Weight } from "@/lib/tests/ai";
import type { StoredProfile } from "@/lib/results";

export interface Candidate { testId: string; headline: string; at: string }

const STORAGE_KEY = "personality-suite:profile-weights";

export function ProfileView({ initial, candidates }: { initial: StoredProfile | null; candidates: Candidate[] }) {
  const [stored, setStored] = useState<StoredProfile | null>(initial);
  const [weights, setWeights] = useState<Record<string, Weight>>(() => Object.fromEntries(candidates.map((c) => [c.testId, 1 as Weight])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);

  // 지난번에 고른 중요도를 이 브라우저에서만 기억한다(없어도 동작)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, number>;
      setWeights((cur) => {
        const next = { ...cur };
        for (const c of candidates) if ([0, 1, 2, 3].includes(saved[c.testId])) next[c.testId] = saved[c.testId] as Weight;
        return next;
      });
    } catch { /* 저장소를 못 쓰면 기본값 */ }
  }, [candidates]);

  function setWeight(testId: string, w: Weight) {
    setWeights((cur) => {
      const next = { ...cur, [testId]: w };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* 무시 */ }
      return next;
    });
  }

  const used = candidates.filter((c) => (weights[c.testId] ?? 1) > 0).length;

  async function build() {
    setBusy(true); setError(""); setNeedKey(false);
    try {
      const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weights }) });
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
            <p className="muted">서로 다른 검사 결과를 하나로 묶어 공통 주제와 달라 보이는 지점을 해석합니다. 반영할 검사는 2종 이상 필요합니다.</p>
          </div>
          <button type="button" className="primary" onClick={build} disabled={busy || used < 2}>
            {busy ? <><Loader2 size={14} className="ls-spin" />만드는 중</> : <><Sparkles size={14} />{p ? "다시 만들기" : "종합 프로필 만들기"}</>}
          </button>
        </div>

        {candidates.length > 0 && (
          <div className="weights" style={{ marginTop: 14 }}>
            <h3>검사별 반영 비중</h3>
            <p className="muted">내가 더 잘 맞는다고 느끼는 검사는 비중을 높이고, 반영하고 싶지 않은 검사는 제외하세요. 검사별 가장 최근 결과가 쓰입니다.</p>
            <div className="weight-list">
              {candidates.map((c) => (
                <label key={c.testId} className="weight-row">
                  <span><b>{testTitle(c.testId)}</b><small>{c.headline} · {new Date(c.at).toLocaleDateString("ko-KR")}</small></span>
                  <select value={weights[c.testId] ?? 1} onChange={(e) => setWeight(c.testId, Number(e.target.value) as Weight)} aria-label={`${testTitle(c.testId)} 반영 비중`}>
                    <option value={0}>제외</option>
                    <option value={1}>{WEIGHT_LABELS[1]}</option>
                    <option value={2}>{WEIGHT_LABELS[2]}</option>
                    <option value={3}>{WEIGHT_LABELS[3]}</option>
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {used < 2 && <p className="notice" style={{ marginTop: 12 }}>{candidates.length < 2 ? "검사를 2종 이상 마친 뒤 만들 수 있습니다." : "반영할 검사를 2종 이상 선택해 주세요."} {candidates.length < 2 && <a className="subtle-link" href="/dashboard">검사하러 가기</a>}</p>}
        {error && <p role="alert" className="error" style={{ marginTop: 10 }}>{error} {needKey && <a className="subtle-link" href="/settings">API키등록·플랫폼연동으로 이동</a>}</p>}
      </section>

      {p && stored && (
        <>
          <section className="card result-head">
            <p className="eyebrow">종합 프로필</p>
            <h1>{p.headline}</h1>
            <p className="muted">
              {new Date(stored.updatedAt).toLocaleString("ko-KR")} 생성 · 재료: {stored.basedOn.map((b) => `${testTitle(b.testId)}(${b.headline}${b.weight && b.weight > 1 ? ` · ${WEIGHT_LABELS[b.weight as 2 | 3]}` : ""})`).join(", ")}
            </p>
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
          {p.changes?.length > 0 && <section className="card"><h2>지난 결과와 달라진 점</h2><ul className="gd-list">{p.changes.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
          {p.caution && <div className="notice">{p.caution}</div>}
        </>
      )}
    </div>
  );
}
