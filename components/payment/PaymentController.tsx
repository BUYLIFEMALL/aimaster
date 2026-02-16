"use client";

import { useState } from "react";
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

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) setSelectedPlan(plan);
  };

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
