"use client";
// 2026-11-01 블로그 9→5 정리: 「이 프로그램의 기능은 ○○로 옮겨졌습니다」 띠(작업실·콘텐츠 제작·올인원 공통 사본).
// 원본은 계속 쓸 수 있고(주소·저장한 글 유지) 새 기능만 옮겨 간 곳에 추가된다. 닫으면 7일 동안 숨긴다.
import { useEffect, useState } from "react";
import { MOVED_NOTICE_HIDE_DAYS, MOVED_NOTICE_KEY, isMovedNoticeHidden } from "@/lib/movedNotice";

export type MovedTarget = { name: string; href: string };

export function MovedNotice({ targets, features }: { targets: MovedTarget[]; features: string[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let hidden = false;
    try { hidden = isMovedNoticeHidden(window.localStorage.getItem(MOVED_NOTICE_KEY)); } catch { /* 저장소를 못 읽으면 보여 준다 */ }
    setVisible(!hidden);
  }, []);
  if (!visible) return null;
  const close = () => {
    try { window.localStorage.setItem(MOVED_NOTICE_KEY, String(Date.now())); } catch { /* 이번 화면에서만 닫힘 */ }
    setVisible(false);
  };
  return (
    <section role="note" aria-label="프로그램 이동 안내" style={{ border: "1px solid var(--line, #e2e8f0)", borderLeft: "4px solid var(--brand, #059669)", background: "#fff", borderRadius: 12, padding: "14px 16px", margin: "0 0 18px", fontSize: 13, lineHeight: 1.6, color: "#1f2937" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>📦 이 프로그램의 좋은 기능은 {targets.map((t) => t.name).join("·")}(으)로 옮겨졌습니다</strong>
        <button type="button" onClick={close} style={{ border: 0, background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", padding: 0 }}>{MOVED_NOTICE_HIDE_DAYS}일 동안 닫기 ✕</button>
      </div>
      <p style={{ margin: "6px 0 0" }}>옮겨 간 기능: {features.join(" · ")}</p>
      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>이 프로그램도 지금처럼 계속 쓸 수 있습니다(주소·저장한 글 유지). 새 기능은 옮겨 간 프로그램에만 추가됩니다. 이용 권한은 프로그램마다 따로 확인됩니다.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {targets.map((t) => <a key={t.href} href={t.href} style={{ display: "inline-block", background: "var(--brand, #059669)", color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{t.name} 열기 →</a>)}
      </div>
    </section>
  );
}
