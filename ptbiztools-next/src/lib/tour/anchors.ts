export const TourAnchors = {
  shell: {
    logo: "shell-logo",
    nav: "shell-nav",
    theme: "shell-theme",
  },
  dashboard: {
    tools: "dashboard-tools",
    activity: "dashboard-activity",
  },
  routes: {
    discovery: "route-discovery-call-grader",
    sales: "route-sales-discovery-grader",
    pl: "route-pl-calculator",
    comp: "route-compensation-calculator",
    analyses: "route-analyses",
  },
} as const;

export type TourAnchorId =
  | (typeof TourAnchors)["shell"][keyof (typeof TourAnchors)["shell"]]
  | (typeof TourAnchors)["dashboard"][keyof (typeof TourAnchors)["dashboard"]]
  | (typeof TourAnchors)["routes"][keyof (typeof TourAnchors)["routes"]];
