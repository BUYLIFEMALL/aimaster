// 인스타 라이트 로고 — 인스타 그라데이션 둥근 사각형 + 흰 💬 (공식 로고 미사용)
export function IgLogo({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="ig-gradient inline-flex shrink-0 items-center justify-center rounded-[30%] text-white"
      style={{ width: size, height: size, fontSize: size * 0.5, lineHeight: 1 }}
    >
      💬
    </span>
  );
}
