"use client";
import { useEffect, useState } from "react";
import { Hero } from "@/components/ui/Hero";
import { api, timeAgo, type Item } from "@/components/ui/api";
import { ShortsPhoneMockup } from "@/components/ui/ShortsPhoneMockup";
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
  const keyCount = keys ? (["gemini", "openai", "anthropic"] as const).filter((p) => keys[p]?.hasKey).length : null;
  const ready = settings && keys?.[settings.provider]?.hasKey;

  return (
    <>
      <Hero 
        eyebrow="YOUTUBE SHORTS STUDIO" 
        title="원스톱 AI 유튜브 쇼츠 자동 제작 대시보드 🎬" 
        desc="주제 1줄만 넣으면 AI가 45초 쇼츠 대본과 씬을 즉시 분할하고, 9:16 유튜브 쇼츠 폰 뷰파인더로 실시간 모니터링하며 1080×1920 세로형 MP4 영상으로 완성합니다." 
        emoji="▶️" 
        meta={["⏱ 제작시간 약 50초", "🎥 1080×1920 FHD", "🔑 본인 AI 키 보안 격리", "⚡ 원클릭 유튜브 즉시 발행"]}
      >
        <a className="button primary btn-3d-yt-red" href="/topic">⚡ 새 쇼츠 만들기</a>
        <a className="button" href="/library">🗂️ 내 보관함 열기</a>
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
      <div className="grid-side" style={{ marginTop: 20 }}>
        {/* 좌측 메인 작업 영역: 최근 대본 목록 */}
        <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>🕘 최근 제작 대본</h2>
            <a className="link-button" href="/library">전체 보관함 보기 →</a>
          </div>
          {projects === null ? (
            <p className="muted">불러오는 중…</p>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <span className="emoji">🎬</span>
              <strong>아직 만든 대본이 없어요</strong>
              <span>주제만 입력하면 30초 만에 첫 유튜브 쇼츠 대본과 씬이 완성됩니다.</span>
              <a className="button primary btn-3d-yt-red" href="/topic" style={{ marginTop: 10 }}>⚡ 첫 쇼츠 대본 만들기</a>
            </div>
          ) : (
            <div className="list">
              {projects.slice(0, 6).map((p) => (
                <a key={p.id} className="list-item" href={`/topic?id=${p.id}`}>
                  <div>
                    <strong>{p.title}</strong>
                    <small>{p.data.category || "직접 입력"} · 씬 {p.data.cards?.length ?? 0}장 · {timeAgo(p.updated_at)}</small>
                  </div>
                  <span className="badge brand">{p.data.source === "manual" ? "내 대본" : "AI 대본"}</span>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 우측 상시 실시간 쇼츠 폰 뷰파인더 목업 덱 */}
        <aside className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 14px", background: "var(--surface)" }}>
          <ShortsPhoneMockup
            title={projects?.[0]?.title || "2026 직장인 연봉 2배 AI 도구"}
            narration={projects?.[0]?.data?.intro?.narration || "아직도 엑셀 수작업 하세요? 이번 달 연봉 앞자리가 바뀌는 AI 실무 툴 5가지!"}
            author="@AI_Shorts_Studio"
            currentTime="00:03"
            totalTime="00:48"
          />
        </aside>
      </div>
    </>
  );
}
