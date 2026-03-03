import AnalysisHistory from "@/components/analyses/AnalysisHistory";
import { TourAnchors } from "@/lib/tour/anchors";

export default function AnalysesPage() {
  return (
    <div data-tour={TourAnchors.routes.analyses}>
      <AnalysisHistory />
    </div>
  );
}
