// 쓰레드 모노 로고 — 흰 둥근 사각형 + 검은 「@」 (Threads 공식 로고를 그대로 쓰지 않는 단순 기호)
export function ThLogo({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[30%] bg-th-primary font-black text-black"
      style={{ width: size, height: size, fontSize: size * 0.62, lineHeight: 1 }}
    >
      @
    </span>
  );
}
