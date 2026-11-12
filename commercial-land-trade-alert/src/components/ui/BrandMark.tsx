// 100. 골든 랜드 프롭테크 인텔리전스 HUD 전용 로고 심볼
// 샴페인 골드 그라데이션 + 토지/빌딩 랜드마크 + 레이더 웨이브
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0 drop-shadow-md">
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0B0F17" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#bg-grad)" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.4" />
      {/* 본관 상업 빌딩 */}
      <rect x="6" y="8" width="10" height="15" rx="1.5" fill="url(#gold-grad)" />
      <rect x="8.5" y="11" width="2" height="2" rx="0.5" fill="#0B0F17" />
      <rect x="12" y="11" width="2" height="2" rx="0.5" fill="#0B0F17" />
      <rect x="8.5" y="15" width="2" height="2" rx="0.5" fill="#0B0F17" />
      <rect x="12" y="15" width="2" height="2" rx="0.5" fill="#0B0F17" />
      {/* 별관 토지/지식산업센터 */}
      <rect x="18" y="13" width="8" height="10" rx="1.5" fill="#10B981" />
      <rect x="20.5" y="16" width="1.8" height="1.8" rx="0.5" fill="#0B0F17" />
      <rect x="23" y="16" width="1.8" height="1.8" rx="0.5" fill="#0B0F17" />
      {/* 토지 랜드마크 & 레이더 파형 */}
      <path d="M4 25.5c4-1.8 8-1.8 12 0s8 1.8 12 0" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="26" cy="6" r="2" fill="#F43F5E" />
    </svg>
  );
}
