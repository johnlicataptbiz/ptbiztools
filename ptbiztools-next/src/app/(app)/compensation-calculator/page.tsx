import DannyCompensationCalculator from "@/components/danny/DannyCompensationCalculator.jsx";
import { TourAnchors } from "@/lib/tour/anchors";

export default function CompensationCalculatorPage() {
  return (
    <div data-tour={TourAnchors.routes.comp}>
      <DannyCompensationCalculator />
    </div>
  );
}
