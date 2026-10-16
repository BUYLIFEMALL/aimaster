"use client";
import { useEffect, useState } from "react";
import { Hero } from "@/components/ui/Hero";
import { api, timeAgo, type Item } from "@/components/ui/api";
import { PROVIDER_LABEL, modelName, type AiProvider } from "@/lib/models";
import type { ShortsScript } from "@/lib/script";

type Keys = Record<string, { hasKey: boolean }>;

export function DashboardView() {
  const [projects, setProjects] = useState<Item<ShortsScript>[] | null>(null);
  const [keys, setKeys] = useState<Keys | null>(null);
  const [settings, setSettings] = useState<{ provider: AiProvider; model: string } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    Promise.all([
      api<{ items: Item<ShortsScript>[] }>("/api/items?kind=project"),
      api<{ keys: Keys }>("/api/keys"),
      api<{ settings: { provider: AiProvider; model: string } }>("/api/settings"),
    ]).then(([p, k, s]) => { setProjects(p.items); setKeys(k.keys); setSettings(s.settings); })
      .catch((e) => setErr(e instanceof Error ? e.message : "불러오지 못했습니다."));
  }, []);
  const keyCount = keys ? Object.values(keys).filter((k) => k.hasKey).length : null;
  const ready = settings && keys?.[settings.provider]?.hasKey;

  return (
    <>
      <Hero eyebrow="DASHBOARD" title="오늘은 어떤 쇼츠를 만들어 볼까요? 🎬" desc="주제 하나만 고르면 AI가 인트로·카드·아웃트로 대본을 만들어 드립니다. 이어지는 단계에서 배경·음성·자막을 입혀 세로 쇼츠 MP4로 완성합니다." emoji="🎞️" meta={["⏱ 대본 1편 약 30초", "🔑 본인 AI 키 사용", "📐 1080×1920 세로"]}>
        <a className="button solid" href="/topic">✨ 새 쇼츠 대본 만들기</a>
        <a className="button" href="/library">🗂️ 보관함 열기</a>
      </Hero>
      {err && <div className="notice error-box" style={{ marginBottom: 16 }}>{err}</div>}
      <div className="stat-grid">
        <div className="stat-card"><span className="stat-icon">📝</span><div><strong>{projects ? projects.length : "…"}</strong><small>저장한 대본</small></div></div>
        <div className="stat-card"><span className="stat-icon">🔑</span><div><strong>{keyCount ?? "…"}<span className="muted" style={{ fontSize: 12 }}> / 3</span></strong><small>등록한 AI 키</small></div></div>
        <div className="stat-card"><span className="stat-icon">🤖</span><div><strong style={{ fontSize: 14 }}>{settings ? modelName(settings.model) : "…"}</strong><small>{settings ? PROVIDER_LABEL[settings.provider] : "사용할 AI"}{settings && (ready ? " · 준비됨" : " · 키 필요")}</small></div></div>
      </div>
      {settings && keys && !ready && (
        <div className="avatar-tip" style={{ marginBottom: 16 }}><span className="avatar">🤖</span><div><strong>먼저 본인 AI 키를 등록해 주세요</strong><p className="muted">지금 선택된 {PROVIDER_LABEL[settings.provider]} 키가 없습니다. <a href="/settings" style={{ textDecoration: "underline" }}>🔑 API키등록·플랫폼연동</a>에서 키를 저장하거나 다른 AI를 고르면 바로 시작할 수 있습니다.</p></div></div>
      )}
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}><h2>🕘 최근 대본</h2><a className="link-button" href="/library">전체 보기 →</a></div>
        {projects === null ? <p className="muted">불러오는 중…</p> : projects.length === 0 ? (
          <div className="empty-state"><span className="emoji">🎬</span><strong>아직 만든 대본이 없어요</strong><span>주제를 고르면 30초 만에 첫 쇼츠 대본이 완성됩니다.</span><a className="button primary" href="/topic">✨ 첫 대본 만들기</a></div>
        ) : (
          <div className="list">{projects.slice(0, 6).map((p) => (
            <a key={p.id} className="list-item" href={`/topic?id=${p.id}`}>
              <div><strong>{p.title}</strong><small>{p.data.category || "직접 입력"} · 카드 {p.data.cards?.length ?? 0}장 · {timeAgo(p.updated_at)}</small></div>
              <span className="badge brand">{p.data.source === "manual" ? "내 대본" : "AI 대본"}</span>
            </a>
          ))}</div>
        )}
      </section>
    </>
  );
}
