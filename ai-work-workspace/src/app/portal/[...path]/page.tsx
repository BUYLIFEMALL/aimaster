// PLAN-20261117-01 E2 7-3(2026-11-17) 손님 포털: /portal/<비밀 주소> — 로그인 없이 행 하나의 회원이 고른 속성만 읽기 전용.
// 판정은 모두 서버(src/server/portal.ts portalView). 기능이 꺼져 있거나 조건이 안 맞으면 404.
// 검색엔진 비노출(noindex), 주소가 다른 사이트로 새지 않게 referrer 없음, 캐시 없음. 값은 React가 글자로만 넣음(HTML 해석 안 함).
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { portalView } from "@/server/portal";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "진행 상황",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function PortalPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const token = Array.isArray(path) && path.length === 1 ? decodeURIComponent(path[0]) : "";
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const view = token ? await portalView(token, ip) : null;
  if (!view) notFound();
  return (
    <main style={{ minHeight: "100vh", background: "#f7f7f5", padding: "48px 16px", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#37352f" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", border: "1px solid #e9e9e7", borderRadius: 12, padding: "28px 24px" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#787774" }}>📋 진행 상황</p>
        <h1 style={{ margin: "6px 0 20px", fontSize: 24, fontWeight: 700, wordBreak: "break-word" }}>{view.title || "제목 없음"}</h1>
        <dl style={{ margin: 0 }}>
          {view.fields.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid #f1f1ef" }}>
              <dt style={{ width: 140, flexShrink: 0, color: "#787774", fontSize: 14 }}>{f.name}</dt>
              <dd style={{ margin: 0, fontSize: 15, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{f.value || "—"}</dd>
            </div>
          ))}
        </dl>
        {view.updatedTime ? (
          <p style={{ margin: "20px 0 0", fontSize: 12, color: "#9b9a97" }}>마지막 변경: {new Date(view.updatedTime).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
        ) : null}
      </div>
    </main>
  );
}
