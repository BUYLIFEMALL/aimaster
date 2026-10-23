// 유튜브 레드 재생(▶) 로고 — 사이드바·로그인 화면 공용
export function YtLogo({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[28%] bg-yt-red"
      style={{ width: size * 1.4, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="#fff">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}
