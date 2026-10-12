"use client";
import Link from "next/link";
export function StudioStart() {
  return (
    <details className="studio-start" open>
      <summary>처음이라면 — 4단계로 시작하세요</summary>
      <div className="start-grid">
        {[
          [
            "스타일 고르기",
            "프리셋·검색·댄스에서 시작점을 고르거나 빌더에서 직접 조합합니다.",
            "presets",
          ],
          [
            "제어 조정",
            "빌더에서 언어·보컬·랩·비유·구조와 편곡을 정합니다.",
            "builder",
          ],
          [
            "기획·작사·확인",
            "본인 AI로 생성하고 직접 수정·확인합니다. 앨범은 곡별로 작사합니다.",
            "album",
          ],
          [
            "Suno에 붙여 넣기",
            "Style·Lyrics·제목을 복사해 본인 Suno Custom 모드에서 음악을 만듭니다.",
            "saved",
          ],
        ].map(([title, body, target], i) => (
          <Link key={title} href={`/?section=${target}`} className="start-card">
            <span className="start-number">{i + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </Link>
        ))}
      </div>
    </details>
  );
}
