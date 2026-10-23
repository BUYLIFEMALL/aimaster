"use client";

import { useState, useEffect, useCallback } from "react";
import PaymentModal from "./PaymentModal";
import PricingTable from "@/components/programs/PricingTable";
import type { PricingPlan } from "@/types/database.types";

interface PaymentControllerProps {
  plans: PricingPlan[];
  programName: string;
  programId: string;
}

export default function PaymentController({ plans, programName, programId }: PaymentControllerProps) {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const handleSelectPlan = useCallback((planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) setSelectedPlan(plan);
  }, [plans]);

  // Hero 버튼에서 발생하는 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const { planId } = (e as CustomEvent).detail;
      handleSelectPlan(planId);
    };
    window.addEventListener("open-payment", handler);
    return () => window.removeEventListener("open-payment", handler);
  }, [handleSelectPlan]);

  return (
    <>
      <PricingTable plans={plans} programId={programId} onSelectPlan={handleSelectPlan} />
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          programName={programName}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </>
  );
}
