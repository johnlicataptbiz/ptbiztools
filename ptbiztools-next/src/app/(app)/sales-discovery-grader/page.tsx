"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlaceholderToolPage } from "@/components/layout/placeholder-tool-page";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole } from "@/lib/auth/roles";

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
    <PlaceholderToolPage
      title="Sales Discovery Grader"
      description="Advisor/admin-restricted route is active and ready for migration of Danny's sales grading workflow."
    />
  );
}
