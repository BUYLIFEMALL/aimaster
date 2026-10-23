// 2026-10-21 사용 종료(병합) — 이 앱은 옛 주소 전달만 한다. 원래 코드: D:\Antigravity\AIMaster_backup\retired-programs\ · git 태그 backup/old-apps-20261021
export const metadata = { title: "AI 유튜브 썸네일 프로 → AI 썸네일·SEO 자동화" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#0f0f12", color: "#f1f1f1", fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
