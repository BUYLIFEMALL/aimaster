"use client";

interface HeroSubscribeButtonProps {
  planCount: number;
  firstPlanId?: string;
}

export default function HeroSubscribeButton({ planCount, firstPlanId }: HeroSubscribeButtonProps) {
  const handleClick = () => {
    if (planCount === 1 && firstPlanId) {
      // 플랜 1개면 바로 결제 모달 열기
      window.dispatchEvent(new CustomEvent("open-payment", { detail: { planId: firstPlanId } }));
    }
    // 플랜이 여러 개면 요금 섹션으로 스크롤
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
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
