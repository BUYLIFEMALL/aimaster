"use client";

export default function HeroSubscribeButton() {
  const handleClick = () => {
    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        const btn = pricingSection.querySelector<HTMLButtonElement>("button");
        if (btn) btn.click();
      }, 500);
    } else {
      alert("구독 신청을 위해 아래 요금 플랜을 선택해 주세요.");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="btn-gold w-full py-4 text-lg rounded-xl font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg"
    >
      지금 구독하기
    </button>
  );
}
