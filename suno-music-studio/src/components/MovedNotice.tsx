"use client";
import { useEffect, useState } from "react";
import { storageKey } from "@/lib/studio/storage";

// 2026-10-21 음악 병합 M1: 「Suno 음악기획 자동화」는 음악(SUNO)자동화의 「정밀 기획 스튜디오」로 옮겼다.
// 옛 앱은 기획을 이 브라우저(localStorage)에만 저장했으므로, 회원이 그 자료를 JSON으로 받아 새 화면의
// 「JSON 가져오기」로 올릴 수 있게 한다(새 화면은 보관함·내 Style을 계정에 저장한다).
const NEW_STUDIO = "https://music-automation.buylife.xyz/studio";

export function MovedNotice({ userId }: { userId: string }) {
  const [raw, setRaw] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ saved: number; styles: number } | null>(null);

  useEffect(() => {
    try {
      const value = localStorage.getItem(storageKey(userId));
      if (!value) return;
      setRaw(value);
      const data = JSON.parse(value);
      setCounts({
        saved: Array.isArray(data?.saved) ? data.saved.length : 0,
        styles: Array.isArray(data?.styles) ? data.styles.length : 0,
      });
    } catch {
      setCounts(null);
    }
  }, [userId]);

  function download() {
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suno-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card" style={{ maxWidth: 720, margin: "48px auto" }}>
      <p className="eyebrow">🎵 프로그램 이동 안내</p>
      <h1>Suno 음악기획 자동화가 「음악(SUNO)자동화」로 합쳐졌습니다</h1>
      <p>
        프리셋 461개·앨범 구성·음악 탐색·댄스 머신 등 이 프로그램의 기획 기능은 이제 <strong>음악(SUNO)자동화의
        「정밀 기획 스튜디오」</strong>에서 그대로 쓸 수 있습니다. 기획한 곡을 <strong>바로 Suno로 생성</strong>하고, 보관함과
        내 Style이 계정에 저장되어 다른 기기에서도 보입니다.
      </p>
      <div className="actions">
        <a className="button primary" href={NEW_STUDIO}>
          정밀 기획 스튜디오 열기 →
        </a>
      </div>
      <hr style={{ margin: "24px 0", borderColor: "var(--line)" }} />
      <h2>이 브라우저에 남은 내 기획 옮기기</h2>
      {counts ? (
        <>
          <p>
            이 브라우저에 보관함 {counts.saved}개, 내 Style {counts.styles}개가 남아 있습니다. JSON으로 내려받은 뒤 정밀 기획
            스튜디오 위쪽의 <strong>「JSON 가져오기」</strong>로 올리면 계정에 저장됩니다.
          </p>
          <div className="actions">
            <button className="primary" onClick={download}>
              내 기획 JSON 내려받기
            </button>
          </div>
        </>
      ) : (
        <p className="muted">
          이 브라우저에는 옮길 기획이 없습니다. 다른 컴퓨터·브라우저에서 쓰셨다면 그곳에서 이 주소를 열어 내려받아 주세요.
        </p>
      )}
    </section>
  );
}
