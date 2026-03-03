import type { User } from "@/lib/ptbiz-api";

export type AccessRole = "admin" | "advisor" | "coach";

export function getEffectiveRole(user: User | null | undefined): AccessRole {
  if (!user) return "coach";

  if (user.role === "admin" || user.role === "advisor" || user.role === "coach") {
    return user.role;
  }

  const title = (user.title || "").toLowerCase();
  const section = user.teamSection || "";

  if (section === "Partners" || section === "Acquisitions" || section === "Client Success") return "admin";
  if (section === "Advisors" || section === "Board") return "advisor";
  if (title.includes("ceo") || title.includes("cfo")) return "admin";
  if (title.includes("advisor")) return "advisor";

  return "coach";
}

export function getRoleLabel(user: User | null | undefined): string {
  const role = getEffectiveRole(user);
  if (role === "admin") return "Admin / Staff / Partner";
  if (role === "advisor") return "Coach / Advisor";
  return user?.title || "Coach";
}
