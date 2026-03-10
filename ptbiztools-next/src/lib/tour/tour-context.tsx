"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { getEffectiveRole } from "@/lib/auth/roles";
import { useSession } from "@/lib/auth/session-context";
import { updateOnboardingState } from "@/lib/ptbiz-api";
import {
  TOUR_VERSION,
  canAccessRoute,
  getGlobalTourSteps,
  getRouteIntroStep,
  isToolRoute,
  type TourStep,
  type TourToolRoute,
} from "@/lib/tour/tour-model";

interface TourContextValue {
  isTourRunning: boolean;
  replayTour: () => void;
  isEnabled: boolean;
}

interface ActiveTour {
  kind: "global" | "route";
  route?: TourToolRoute;
  isReplay: boolean;
  steps: TourStep[];
  index: number;
}

const TourContext = createContext<TourContextValue | null>(null);

const TOUR_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TOUR === "true";

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
}

function dispatchMenuOpen() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tour:open-menu"));
}

function getSeenToolIntroVersion(
  intros: Record<string, { version: string; seenAt: string }> | null | undefined,
  route: string,
) {
  return intros?.[route]?.version ?? null;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useSession();
  const role = getEffectiveRole(user);

  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);
  const [localCompletedVersion, setLocalCompletedVersion] = useState<string | null>(null);
  const [localSeenIntros, setLocalSeenIntros] = useState<Record<string, string>>({});
  const pendingGlobalStartRef = useRef(false);

  const completedVersion = localCompletedVersion ?? user?.onboardingTourVersion ?? null;
  const hasCompletedGlobal = completedVersion === TOUR_VERSION;

  const shouldShowForRoute = useCallback(
    (route: TourToolRoute) => {
      if (!canAccessRoute(role, route)) return false;
      const fromUser = getSeenToolIntroVersion(user?.onboardingToolIntros, route);
      const fromLocal = localSeenIntros[route] ?? null;
      return (fromLocal ?? fromUser) !== TOUR_VERSION;
    },
    [localSeenIntros, role, user?.onboardingToolIntros],
  );

  const persistGlobalComplete = useCallback(async () => {
    setLocalCompletedVersion(TOUR_VERSION);
    const result = await updateOnboardingState({ completedVersion: TOUR_VERSION });
    if (result.error) {
      console.error("Tour completion sync failed:", result.error);
    }
  }, []);

  const persistRouteIntro = useCallback(async (route: TourToolRoute) => {
    setLocalSeenIntros((prev) => ({ ...prev, [route]: TOUR_VERSION }));
    const result = await updateOnboardingState({
      toolIntroSeen: { route, version: TOUR_VERSION },
    });
    if (result.error) {
      console.error("Tour intro sync failed:", result.error);
    }
  }, []);

  const startGlobalTour = useCallback(
    (isReplay: boolean) => {
      const steps = getGlobalTourSteps(role);
      if (steps.length === 0) return;
      setActiveTour({ kind: "global", isReplay, steps, index: 0 });
    },
    [role],
  );

  const startRouteIntro = useCallback((route: TourToolRoute) => {
    const step = getRouteIntroStep(route);
    setActiveTour({ kind: "route", route, isReplay: false, steps: [step], index: 0 });
  }, []);

  useEffect(() => {
    if (!TOUR_ENABLED || !user || isLoading || activeTour) return;

    if (pendingGlobalStartRef.current) {
      if (pathname === "/dashboard") {
        pendingGlobalStartRef.current = false;
        window.setTimeout(() => startGlobalTour(false), 0);
      }
      return;
    }

    if (pathname === "/dashboard") {
      if (!hasCompletedGlobal) {
        window.setTimeout(() => startGlobalTour(false), 0);
      }
      return;
    }

    if (isToolRoute(pathname) && shouldShowForRoute(pathname)) {
      window.setTimeout(() => startRouteIntro(pathname), 0);
    }
  }, [
    activeTour,
    hasCompletedGlobal,
    isLoading,
    pathname,
    shouldShowForRoute,
    startGlobalTour,
    startRouteIntro,
    user,
  ]);

  const currentStep = useMemo(() => {
    if (!activeTour) return null;
    return activeTour.steps[activeTour.index] ?? null;
  }, [activeTour]);

  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.requiresMenuOpen && isMobileViewport()) {
      dispatchMenuOpen();
    }
  }, [currentStep]);

  const closeAndPersist = useCallback(async () => {
    if (!activeTour) return;

    if (activeTour.kind === "global") {
      await persistGlobalComplete();
      setActiveTour(null);
      return;
    }

    if (activeTour.route) {
      await persistRouteIntro(activeTour.route);
    }
    setActiveTour(null);
  }, [activeTour, persistGlobalComplete, persistRouteIntro]);

  const handleNext = useCallback(() => {
    if (!activeTour) return;

    if (activeTour.index >= activeTour.steps.length - 1) {
      void closeAndPersist();
      return;
    }

    setActiveTour((prev) => {
      if (!prev) return prev;
      return { ...prev, index: prev.index + 1 };
    });
  }, [activeTour, closeAndPersist]);

  const handleBack = useCallback(() => {
    setActiveTour((prev) => {
      if (!prev) return prev;
      return { ...prev, index: Math.max(0, prev.index - 1) };
    });
  }, []);

  const handleSkip = useCallback(() => {
    void closeAndPersist();
  }, [closeAndPersist]);

  const handleMissingAnchor = useCallback(() => {
    if (!activeTour) return;
    if (activeTour.index >= activeTour.steps.length - 1) {
      void closeAndPersist();
      return;
    }
    setActiveTour((prev) => {
      if (!prev) return prev;
      return { ...prev, index: prev.index + 1 };
    });
  }, [activeTour, closeAndPersist]);

  const handleStartFullTour = useCallback(() => {
    if (activeTour?.kind === "route" && activeTour.route) {
      void persistRouteIntro(activeTour.route);
    }
    setActiveTour(null);
    pendingGlobalStartRef.current = true;
    router.push("/dashboard");
  }, [activeTour, persistRouteIntro, router]);

  const replayTour = useCallback(() => {
    if (!TOUR_ENABLED) return;
    if (!user) return;
    if (pathname !== "/dashboard") {
      pendingGlobalStartRef.current = true;
      router.push("/dashboard");
      return;
    }
    startGlobalTour(true);
  }, [pathname, router, startGlobalTour, user]);

  const value = useMemo<TourContextValue>(
    () => ({
      isTourRunning: Boolean(activeTour),
      replayTour,
      isEnabled: TOUR_ENABLED,
    }),
    [activeTour, replayTour],
  );

  const showStartFullTour = Boolean(activeTour && activeTour.kind === "route" && !hasCompletedGlobal);

  return (
    <TourContext.Provider value={value}>
      {children}
      {TOUR_ENABLED && activeTour && currentStep ? (
        <TourOverlay
          key={`${activeTour.kind}-${activeTour.route ?? "global"}-${activeTour.index}-${currentStep.anchorId}`}
          step={currentStep}
          stepIndex={activeTour.index}
          totalSteps={activeTour.steps.length}
          canGoBack={activeTour.index > 0}
          canGoNext
          showStartFullTour={showStartFullTour}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={handleSkip}
          onMissingAnchor={handleMissingAnchor}
          onStartFullTour={handleStartFullTour}
        />
      ) : null}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within TourProvider");
  }
  return context;
}
