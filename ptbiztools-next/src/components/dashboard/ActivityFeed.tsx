"use client";

import { motion } from "framer-motion";
import { Users, ClipboardList, FileText, Calculator, Clock } from "lucide-react";
import { itemVariants } from "./animations";

interface ActivityItem {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
  userName?: string;
  userImageUrl?: string | null;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getActionIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    login_success: <Users size={16} />,
    coaching_analysis_saved: <ClipboardList size={16} />,
    pdf_export_saved: <FileText size={16} />,
    pl_report_generated: <Calculator size={16} />,
    pl_pdf_generated: <FileText size={16} />,
    transcript_uploaded: <FileText size={16} />,
    transcript_graded: <ClipboardList size={16} />,
  };
  return icons[type] || <Clock size={16} />;
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <motion.section variants={itemVariants} className="activity-feed">
      <div className="section-header">
        <h3>Recent Activity</h3>
      </div>
      <div className="activity-list">
        {items.length === 0 ? (
          <p className="empty-state">No recent activity</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="activity-item">
              <div className="activity-avatar">
                {item.userImageUrl ? (
                  <img src={item.userImageUrl} alt={item.userName || ""} />
                ) : (
                  <span className="avatar-initials">{getInitials(item.userName)}</span>
                )}
              </div>
              <div className="activity-content">
                <p className="activity-description">{item.description}</p>
                <span className="activity-time">{formatDate(item.createdAt)}</span>
              </div>
              <div className="activity-icon">{getActionIcon(item.actionType)}</div>
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}
