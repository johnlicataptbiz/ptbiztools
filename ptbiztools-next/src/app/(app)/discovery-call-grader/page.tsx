import DiscoveryCallGrader from "@/components/discovery/DiscoveryCallGrader";
import { TourAnchors } from "@/lib/tour/anchors";

export default function DiscoveryCallGraderPage() {
  return (
    <div data-tour={TourAnchors.routes.discovery}>
      <DiscoveryCallGrader />
    </div>
  );
}
