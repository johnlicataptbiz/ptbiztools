"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { ClinicBackground } from "@/components/clinic/ClinicBackgrounds";
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
      style={{ position: "relative" }}
    >
      <ClinicBackground pattern="growth" opacity={0.06} />
      <div
        className="dashboard-header-content"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>{greeting}</h1>
        <button
          className="changelog-trigger-btn"
          onClick={onOpenChangelog}
          title="View changelog"
          style={{ marginLeft: "auto" }}
        >
          <History size={18} />
        </button>
      </div>
    </motion.section>
  );
}
