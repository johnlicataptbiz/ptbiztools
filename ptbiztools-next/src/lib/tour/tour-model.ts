import type { AccessRole } from "@/lib/auth/roles";
import { TourAnchors, type TourAnchorId } from "@/lib/tour/anchors";

export const TOUR_VERSION = "2026.03.1";

export const TOUR_TOOL_ROUTES = [
  "/discovery-call-grader",
  "/sales-discovery-grader",
  "/pl-calculator",
  "/compensation-calculator",
  "/analyses",
] as const;

export type TourToolRoute = (typeof TOUR_TOOL_ROUTES)[number];

export interface TourStep {
  id: string;
  anchorId: TourAnchorId;
  title: string;
  description: string;
  requiresMenuOpen?: boolean;
  roles?: AccessRole[];
}

export interface RouteIntroContent {
  title: string;
  description: string;
}

const BASE_GLOBAL_STEPS: TourStep[] = [
  {
    id: "workspace-logo",
    anchorId: TourAnchors.shell.logo,
    title: "Workspace Home",
    description: "Use the PT Biz logo area to get back to dashboard quickly from any tool.",
    requiresMenuOpen: true,
  },
  {
    id: "workspace-navigation",
    anchorId: TourAnchors.shell.nav,
    title: "Primary Tool Navigation",
    description: "This left navigation is your command center for all available tools in your role.",
    requiresMenuOpen: true,
  },
  {
    id: "workspace-theme",
    anchorId: TourAnchors.shell.theme,
    title: "Theme Switcher",
    description: "Switch workspace themes any time. Your choice is saved per browser.",
  },
  {
    id: "dashboard-tools",
    anchorId: TourAnchors.dashboard.tools,
    title: "Tool Launch Cards",
    description: "Open each grader/calculator from here with role-appropriate access.",
  },
  {
    id: "dashboard-activity",
    anchorId: TourAnchors.dashboard.activity,
    title: "Activity + Performance",
    description: "Track usage, outputs, and recent momentum from this dashboard section.",
  },
];

const ROUTE_INTROS: Record<TourToolRoute, RouteIntroContent> = {
  "/discovery-call-grader": {
    title: "Discovery Call Grader",
    description: "Upload/paste transcripts, run deterministic scoring, and generate saved coaching outputs.",
  },
  "/sales-discovery-grader": {
    title: "Sales Discovery Grader",
    description: "Run the closer call framework with evidence-backed phase scoring and critical behavior checks.",
  },
  "/pl-calculator": {
    title: "P&L Calculator",
    description: "Evaluate clinic financial health, generate findings, and export P&L reports.",
  },
  "/compensation-calculator": {
    title: "Compensation Calculator",
    description: "Model provider compensation decisions and stress-test compensation assumptions.",
  },
  "/analyses": {
    title: "Saved Analyses",
    description: "Review historical call grades, P&L audits, and export artifacts in one place.",
  },
};

const ROUTE_ANCHOR_MAP: Record<TourToolRoute, TourAnchorId> = {
  "/discovery-call-grader": TourAnchors.routes.discovery,
  "/sales-discovery-grader": TourAnchors.routes.sales,
  "/pl-calculator": TourAnchors.routes.pl,
  "/compensation-calculator": TourAnchors.routes.comp,
  "/analyses": TourAnchors.routes.analyses,
};

export function canAccessRoute(role: AccessRole, route: TourToolRoute): boolean {
  if (route === "/sales-discovery-grader") {
    return role === "admin" || role === "advisor";
  }
  return true;
}

export function getGlobalTourSteps(role: AccessRole): TourStep[] {
  return BASE_GLOBAL_STEPS.map((step) => {
    if (step.id === "workspace-navigation") {
      const extra =
        role === "admin" || role === "advisor"
          ? " You also have access to Sales Grader."
          : " Sales Grader is hidden for coach-only access levels.";
      return { ...step, description: `${step.description}${extra}` };
    }
    return step;
  });
}

export function isToolRoute(pathname: string): pathname is TourToolRoute {
  return (TOUR_TOOL_ROUTES as readonly string[]).includes(pathname);
}

export function getRouteIntroStep(pathname: TourToolRoute): TourStep {
  const intro = ROUTE_INTROS[pathname];
  return {
    id: `intro-${pathname.replaceAll("/", "").replaceAll("-", "_")}`,
    anchorId: ROUTE_ANCHOR_MAP[pathname],
    title: intro.title,
    description: intro.description,
  };
}
