"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentType, CSSProperties } from "react";
import {
  Activity,
  Calculator,
  ClipboardList,
  Medal,
  PhoneCall,
  Users,
} from "lucide-react";
import { CLINIC_SVGS } from "@/constants/clinic-svgs";
import { TOOL_BADGES } from "@/constants/tool-badges";
import { itemVariants } from "./animations";

interface Tool {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  badgeUrl?: string;
  color: string;
}

const tools: Tool[] = [
  {
    title: "Discovery Call Grader",
    description: "AI-powered analysis of discovery calls",
    href: "/discovery-call-grader",
    icon: PhoneCall,
    badgeUrl: TOOL_BADGES.discovery,
    color: "var(--accent)",
  },
  {
    title: "Sales Call Grader",
    description: "Grade and analyze sales calls",
    href: "/sales-discovery-grader",
    icon: Medal,
    badgeUrl: TOOL_BADGES.sales,
    color: "var(--success)",
  },
  {
    title: "P&L Calculator",
    description: "Profit & Loss analysis tool",
    href: "/pl-calculator",
    icon: Calculator,
    badgeUrl: TOOL_BADGES.pl,
    color: "var(--info)",
  },
  {
    title: "Compensation Calculator",
    description: "Calculate fair compensation packages",
    href: "/compensation-calculator",
    icon: Users,
    badgeUrl: TOOL_BADGES.comp,
    color: "var(--warning)",
  },
  {
    title: "PT Stack Lab",
    description: "Explore clinic technology stacks",
    href: "/stack-lab",
    icon: Activity,
    color: "#8b5cf6",
    badgeUrl: CLINIC_SVGS.analyticsStrip,
  },
  {
    title: "Analyses",
    description: "View all your coaching analyses",
    href: "/analyses",
    icon: ClipboardList,
    color: "#64748b",
  },
];

export function ToolGrid() {
  return (
    <motion.section variants={itemVariants} className="tools-grid">
      {tools.map((tool) => (
        <Link key={tool.href} href={tool.href} className="tool-card-link">
          <article className="tool-card">
            <div className="tool-card-header">
              <div className="tool-icon" style={{ background: `${tool.color}20`, color: tool.color }}>
                <tool.icon size={20} />
              </div>
              {tool.badgeUrl && (
                <img
                  src={tool.badgeUrl}
                  alt=""
                  className="tool-badge"
                  style={{ height: 20, objectFit: "contain" }}
                />
              )}
            </div>
            <div className="tool-card-body">
              <h3 className="tool-title">{tool.title}</h3>
              <p className="tool-description">{tool.description}</p>
            </div>
          </article>
        </Link>
      ))}
    </motion.section>
  );
}
