"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { ClinicBackground } from "@/components/clinic/ClinicBackgrounds";
import { CLINIC_SVGS } from "@/constants/clinic-svgs";
import { itemVariants } from "./animations";

interface DashboardHeroProps {
  greeting: string;
  onOpenChangelog: () => void;
}

export function DashboardHero({ greeting, onOpenChangelog }: DashboardHeroProps) {
  return (
    <motion.section
      variants={itemVariants}
      className="dashboard-v2-hero dashboard-header clinic-pattern-overlay clinic-pattern-growth"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
      }}
    >
      <ClinicBackground pattern="growth" opacity={0.06} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(8,15,38,0.84), rgba(14,35,75,0.52)), url(${CLINIC_SVGS.clinicDashboardHighlightA})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.32,
        }}
      />
      <div
        className="dashboard-header-content"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", textShadow: "0 8px 28px rgba(0,0,0,0.22)" }}>{greeting}</h1>
        <button
          className="changelog-trigger-btn"
          onClick={onOpenChangelog}
          title="View changelog"
          style={{ marginLeft: "auto", backdropFilter: "blur(8px)", background: "rgba(15,23,42,0.32)" }}
        >
          <History size={18} />
        </button>
      </div>
    </motion.section>
  );
}
