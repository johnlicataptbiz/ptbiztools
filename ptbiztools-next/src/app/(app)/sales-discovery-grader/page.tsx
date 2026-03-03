"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DannyCloserCallGrader from "@/components/danny/DannyCloserCallGrader";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole } from "@/lib/auth/roles";
import { TourAnchors } from "@/lib/tour/anchors";

export default function SalesDiscoveryGraderPage() {
  const router = useRouter();
  const { user } = useSession();
  const role = getEffectiveRole(user);
  const canAccess = role === "admin" || role === "advisor";

  useEffect(() => {
    if (!canAccess) {
      router.replace("/dashboard");
    }
  }, [canAccess, router]);

  if (!canAccess) return null;

  return (
    <div data-tour={TourAnchors.routes.sales}>
      <DannyCloserCallGrader />
    </div>
  );
}
