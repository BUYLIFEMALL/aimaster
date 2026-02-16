"use client";

export default function HeroSubscribeButton() {
  const handleClick = () => {
    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
      // 스크롤 후 첫 번째 구독 버튼 자동 클릭
      setTimeout(() => {
        const btn = pricingSection.querySelector<HTMLButtonElement>("button");
        if (btn) btn.click();
      }, 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="btn-gold w-full py-4 text-lg rounded-xl font-bold"
    >
      지금 구독하기
    </button>
  );
}
