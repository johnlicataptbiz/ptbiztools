"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  GitCommit, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp,
  Clock,
  FileCode,
  Bug,
  Sparkles,
  BookOpen,
  Wrench,
  MoreHorizontal
} from "lucide-react";
import "@/styles/changelog.css";

interface ChangelogEntry {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  type: "feature" | "fix" | "chore" | "docs" | "refactor" | "other";
  category?: string;
}

interface ChangelogData {
  success: boolean;
  totalCommits: number;
  dates: string[];
  entries: Record<string, ChangelogEntry[]>;
  lastUpdated: string;
}

const typeIcons = {
  feature: Sparkles,
  fix: Bug,
  docs: BookOpen,
  refactor: Wrench,
  chore: FileCode,
  other: MoreHorizontal,
};

const typeColors = {
  feature: "#22c55e", // green
  fix: "#ef4444", // red
  docs: "#3b82f6", // blue
  refactor: "#f59e0b", // amber
  chore: "#6b7280", // gray
  other: "#8b5cf6", // purple
};

const typeLabels = {
  feature: "Feature",
  fix: "Fix",
  docs: "Docs",
  refactor: "Refactor",
  chore: "Chore",
  other: "Other",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [data, setData] = useState<ChangelogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ChangelogEntry["type"] | "all">("all");

  useEffect(() => {
    if (isOpen && !data) {
      fetchChangelog();
    }
  }, [data, isOpen]);

  // Auto-expand the first 3 dates
  useEffect(() => {
    if (data?.dates && expandedDates.size === 0) {
      const initialExpanded = new Set(data.dates.slice(0, 3));
      setExpandedDates(initialExpanded);
    }
  }, [data, expandedDates.size]);

  async function fetchChangelog() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/changelog");
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.message || "Failed to load changelog");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changelog");
    } finally {
      setLoading(false);
    }
  }

  function toggleDate(date: string) {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  }

  function expandAll() {
    if (data?.dates) {
      setExpandedDates(new Set(data.dates));
    }
  }

  function collapseAll() {
    setExpandedDates(new Set());
  }

  const filteredEntries = data?.entries 
    ? Object.entries(data.entries).reduce((acc, [date, entries]) => {
        const filtered = filter === "all" 
          ? entries 
          : entries.filter(e => e.type === filter);
        if (filtered.length > 0) {
          acc[date] = filtered;
        }
        return acc;
      }, {} as Record<string, ChangelogEntry[]>)
    : {};

  const filteredDates = data?.dates.filter(date => filteredEntries[date]?.length > 0) || [];

  const stats = data?.entries 
    ? Object.values(data.entries).flat().reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="changelog-backdrop"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="changelog-modal"
          >
            {/* Header */}
            <div className="changelog-header">
              <div className="changelog-header-content">
                <div className="changelog-title">
                  <GitCommit size={24} />
                  <h2>Changelog</h2>
                  {data?.totalCommits && (
                    <span className="changelog-badge">{data.totalCommits} commits</span>
                  )}
                </div>
                <button className="changelog-close" onClick={onClose}>
                  <X size={20} />
                </button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="changelog-stats">
                  {Object.entries(stats).map(([type, count]) => {
                    const Icon = typeIcons[type as keyof typeof typeIcons] || MoreHorizontal;
                    const color = typeColors[type as keyof typeof typeColors] || "#6b7280";
                    return (
                      <div 
                        key={type} 
                        className={`changelog-stat ${filter === type ? "active" : ""}`}
                        onClick={() => setFilter(filter === type ? "all" : type as ChangelogEntry["type"])}
                        style={{ "--stat-color": color } as React.CSSProperties}
                      >
                        <Icon size={14} />
                        <span>{count}</span>
                        <small>{typeLabels[type as keyof typeof typeLabels]}</small>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Filter & Controls */}
              <div className="changelog-controls">
                <div className="changelog-filters">
                  <button 
                    className={`filter-btn ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                  >
                    All
                  </button>
                  {(["feature", "fix", "refactor", "docs", "chore"] as const).map((type) => (
                    <button
                      key={type}
                      className={`filter-btn ${filter === type ? "active" : ""}`}
                      onClick={() => setFilter(type)}
                      style={{ 
                        "--filter-color": typeColors[type] 
                      } as React.CSSProperties}
                    >
                      {typeLabels[type]}
                    </button>
                  ))}
                </div>
                <div className="changelog-expand-controls">
                  <button onClick={expandAll} className="control-btn">
                    Expand All
                  </button>
                  <button onClick={collapseAll} className="control-btn">
                    Collapse All
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="changelog-content">
              {loading ? (
                <div className="changelog-loading">
                  <div className="changelog-spinner" />
                  <p>Loading git history...</p>
                </div>
              ) : error ? (
                <div className="changelog-error">
                  <p>{error}</p>
                  <button onClick={fetchChangelog}>Retry</button>
                </div>
              ) : filteredDates.length === 0 ? (
                <div className="changelog-empty">
                  <GitCommit size={48} />
                  <p>No commits found{filter !== "all" ? " for this filter" : ""}</p>
                </div>
              ) : (
                <div className="changelog-timeline">
                  {filteredDates.map((date) => {
                    const entries = filteredEntries[date] || [];
                    const isExpanded = expandedDates.has(date);
                    
                    return (
                      <div key={date} className="changelog-date-group">
                        <button 
                          className="changelog-date-header"
                          onClick={() => toggleDate(date)}
                        >
                          <div className="date-header-left">
                            <Calendar size={16} />
                            <span className="date-label">{formatDate(date)}</span>
                            <span className="date-count">({entries.length})</span>
                          </div>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="changelog-entries"
                            >
                              {entries.map((entry, index) => {
                                const Icon = typeIcons[entry.type];
                                const color = typeColors[entry.type];
                                
                                return (
                                  <motion.div
                                    key={entry.hash}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="changelog-entry"
                                  >
                                    <div 
                                      className="entry-type-icon"
                                      style={{ background: `${color}20`, color }}
                                    >
                                      <Icon size={14} />
                                    </div>
                                    
                                    <div className="entry-content">
                                      <div className="entry-header">
                                        <span 
                                          className="entry-type-badge"
                                          style={{ background: `${color}20`, color }}
                                        >
                                          {typeLabels[entry.type]}
                                        </span>
                                        {entry.category && (
                                          <span className="entry-category">
                                            {entry.category}
                                          </span>
                                        )}
                                        <span className="entry-hash" title={entry.hash}>
                                          {entry.hash}
                                        </span>
                                      </div>
                                      
                                      <p className="entry-message">{entry.message}</p>
                                      
                                      <div className="entry-meta">
                                        <span className="entry-author">
                                          <User size={12} />
                                          {entry.author}
                                        </span>
                                        <span className="entry-time">
                                          <Clock size={12} />
                                          {formatRelativeTime(date)}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {data?.lastUpdated && (
              <div className="changelog-footer">
                <p>Last updated: {formatRelativeTime(data.lastUpdated)}</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
