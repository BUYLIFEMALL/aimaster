// 증명사진 계측 가이드선(참고용 SVG). 정수리·눈높이·턱끝·어깨선·좌우 중심축을 표시한다.
export function GuideOverlay() {
  return (
    <div className="guide-overlay" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="50" y1="0" x2="50" y2="100" stroke="#0ea5e9" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
        <line x1="15" y1="10" x2="85" y2="10" stroke="#6366f1" strokeWidth="0.4" strokeDasharray="2 1.5" />
        <line x1="10" y1="38" x2="90" y2="38" stroke="#0ea5e9" strokeWidth="0.5" />
        <line x1="20" y1="78" x2="80" y2="78" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 1.5" />
        <line x1="5" y1="88" x2="95" y2="88" stroke="#64748b" strokeWidth="0.4" strokeDasharray="3 3" />
        <ellipse cx="50" cy="44" rx="25" ry="34" fill="none" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="3 2" />
      </svg>
      <span style={{ top: "8%" }}>정수리선</span>
      <span style={{ top: "36%" }}>눈높이</span>
      <span style={{ top: "76%" }}>턱끝선</span>
      <span style={{ top: "86%" }}>어깨 수평</span>
    </div>
  );
}
