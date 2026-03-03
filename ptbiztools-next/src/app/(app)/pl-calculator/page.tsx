"use client";

import DannyFinancialAudit from "@/components/danny/DannyFinancialAudit";
import { TourAnchors } from "@/lib/tour/anchors";

export default function PlCalculatorPage() {
  return (
    <div data-tour={TourAnchors.routes.pl}>
      <DannyFinancialAudit />
    </div>
  );
}
