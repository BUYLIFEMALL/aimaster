"use client";
import { useEffect, useState } from "react";
import { FEATURE_INFO, type ReportSummary } from "@/lib/kw/types";

/** 대시보드 상단 지표 4종 — 기록·즐겨찾기·최근 키워드·키 연결 상태(값은 받지 않고 등록 여부만). */
export function DashboardStats() {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [keyCount, setKeyCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) setReports(Array.isArray(d.reports) ? d.reports : []); })
      .catch(() => { if (alive) setReports([]); });
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.keys) return;
        const k = d.keys as Record<string, { hasKey: boolean }>;
        const groups = [
          !!k.gemini?.hasKey,
          !!k.naver_client_id?.hasKey && !!k.naver_client_secret?.hasKey,
          !!k.naver_ads_api_key?.hasKey && !!k.naver_ads_secret_key?.hasKey && !!k.naver_ads_customer_id?.hasKey,
        ];
        setKeyCount(groups.filter(Boolean).length);
      })
      .catch(() => { /* 지표만 비워 둔다 */ });
    return () => { alive = false; };
  }, []);

  const latest = reports?.[0];
  const latestFeature = latest ? FEATURE_INFO.find((f) => f.id === latest.feature)?.title : null;

  return (
    <div className="mx-kpi-grid" aria-label="작업 현황">
      <div className="mx-kpi">
        <small>📊 저장된 분석</small>
        <strong>{reports ? reports.length : "—"}</strong>
        <span>최근 100건 + 즐겨찾기 보관</span>
      </div>
      <div className="mx-kpi amber">
        <small>⭐ 즐겨찾기</small>
        <strong>{reports ? reports.filter((r) => r.favorite).length : "—"}</strong>
        <span>오래 보관할 기록</span>
      </div>
      <div className="mx-kpi green">
        <small>🕒 최근 분석</small>
        <strong>{latest ? latest.keyword : "—"}</strong>
        <span>{latest ? `${latestFeature ?? latest.feature} · ${new Date(latest.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}` : "아직 분석 기록 없음"}</span>
      </div>
      <div className="mx-kpi muted">
        <small>🔑 키 연결</small>
        <strong>{keyCount == null ? "—" : `${keyCount} / 3`}</strong>
        <span>Gemini · 네이버 검색 · 검색광고(선택)</span>
      </div>
    </div>
  );
}
