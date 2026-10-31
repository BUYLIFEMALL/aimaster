// 이 프로그램 전용 로고. 색과 틀은 부동산 시리즈를 따르되, 건물 두 동과 땅 선으로 구분한다.
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#0b5d3b" />
      <rect x="7" y="9" width="9" height="14" rx="1" fill="#fff" />
      <rect x="18" y="14" width="7" height="9" rx="1" fill="#7ee2a8" />
      <rect x="9.5" y="12" width="1.6" height="1.6" fill="#0b5d3b" />
      <rect x="12.5" y="12" width="1.6" height="1.6" fill="#0b5d3b" />
      <rect x="9.5" y="15.5" width="1.6" height="1.6" fill="#0b5d3b" />
      <rect x="12.5" y="15.5" width="1.6" height="1.6" fill="#0b5d3b" />
      <path d="M4 25.5c4-1.6 8-1.6 12 0s8 1.6 12 0" stroke="#03c75a" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
