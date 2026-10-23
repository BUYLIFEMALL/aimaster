"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// 옛 suno-music-studio 사이드바의 구역 메뉴(STEPS)를 음악(SUNO)자동화 안에서는 위쪽 탭으로 보여 준다(2026-10-21 병합 M1).
const STEPS = [
  { id: "builder", name: "🎚️ 빌더 (작사·곡 기획)", badge: "" },
  { id: "album", name: "💿 앨범 구성", badge: "3~12" },
  { id: "presets", name: "🎨 스타일 프리셋", badge: "461" },
  { id: "search", name: "🔎 음악 탐색·검색", badge: "AI" },
  { id: "dance", name: "🕺 댄스 머신", badge: "200" },
  { id: "saved", name: "🗂️ 검수·보관함", badge: "" },
  { id: "guide", name: "📖 스튜디오 매뉴얼", badge: "" },
];

export function StudioTabs() {
  const raw = useSearchParams().get("section") || "builder";
  const section = raw === "style" ? "presets" : raw === "song" ? "builder" : raw;
  return (
    <nav className="studio-tabs" aria-label="정밀 기획 스튜디오 구역">
      {STEPS.map((s) => (
        <Link
          key={s.id}
          href={`/studio?section=${s.id}`}
          className={`studio-tab ${section === s.id ? "active" : ""}`}
          aria-current={section === s.id ? "page" : undefined}
        >
          {s.name}
          {s.badge && <small>{s.badge}</small>}
        </Link>
      ))}
    </nav>
  );
}
