"use client";

import { motion } from "framer-motion";
import { Medal, FileText, LogIn, ClipboardList, Users } from "lucide-react";
import { itemVariants } from "./animations";

interface StatsGridProps {
  isAdmin: boolean;
  isLoading: boolean;
  adminUsage?: {
    totals: {
      coachingAnalyses: number;
      pdfExports: number;
      successfulLogins: number;
      activeUsers: number;
    };
  } | null;
  coachStats: {
    totalGrades: number;
    totalPdfs: number;
    totalTranscripts: number;
  };
  activityFeedLength: number;
}

export function StatsGrid({ isAdmin, isLoading, adminUsage, coachStats, activityFeedLength }: StatsGridProps) {
  return (
    <motion.section variants={itemVariants} className="stats-grid">
      <article className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(233, 69, 96, 0.15)" }}>
          <Medal size={22} style={{ color: "var(--accent)" }} />
        </div>
        <div className="stat-content">
          <span className="stat-value">
            {isLoading ? "..." : isAdmin ? (adminUsage?.totals.coachingAnalyses ?? 0) : coachStats.totalGrades}
          </span>
          <span className="stat-label">Coaching Analyses</span>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(45, 138, 78, 0.15)" }}>
          <FileText size={22} style={{ color: "var(--success)" }} />
        </div>
        <div className="stat-content">
          <span className="stat-value">
            {isLoading ? "..." : isAdmin ? (adminUsage?.totals.pdfExports ?? 0) : coachStats.totalPdfs}
          </span>
          <span className="stat-label">PDF Exports</span>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(15, 52, 96, 0.25)" }}>
          {isAdmin ? <LogIn size={22} style={{ color: "var(--info)" }} /> : <ClipboardList size={22} style={{ color: "var(--info)" }} />}
        </div>
        <div className="stat-content">
          <span className="stat-value">
            {isLoading ? "..." : isAdmin ? (adminUsage?.totals.successfulLogins ?? 0) : coachStats.totalTranscripts}
          </span>
          <span className="stat-label">{isAdmin ? "Successful Logins" : "Transcripts Uploaded"}</span>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-icon" style={{ background: "rgba(196, 127, 23, 0.15)" }}>
          <Users size={22} style={{ color: "var(--warning)" }} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{isLoading ? "..." : isAdmin ? (adminUsage?.totals.activeUsers ?? 0) : activityFeedLength}</span>
          <span className="stat-label">{isAdmin ? "Active Users" : "Recent Activities"}</span>
        </div>
      </article>
    </motion.section>
  );
}
