"use client";

import { useEffect, useState } from "react";
import PaymentModal from "./PaymentModal";
import type { PricingPlan } from "@/types/database.types";

interface PaymentControllerProps {
  plans: PricingPlan[];
  programName: string;
}

export default function PaymentController({ plans, programName }: PaymentControllerProps) {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { planId } = (e as CustomEvent).detail;
      const plan = plans.find((p) => p.id === planId);
      if (plan) setSelectedPlan(plan);
    };
    window.addEventListener("open-payment", handler);
    return () => window.removeEventListener("open-payment", handler);
  }, [plans]);

  if (!selectedPlan) return null;

  return (
    <PaymentModal
      plan={selectedPlan}
      programName={programName}
      onClose={() => setSelectedPlan(null)}
    />
  );
}
