"use client";

import "@/styles/login.css";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CorexButton, CorexInput } from "@/components/corex/CorexComponents";
import { getTeamMemberMeta } from "@/constants/team-credentials";
import { useSession } from "@/lib/auth/session-context";
import { getTeamMembers, setupPassword, type TeamMember } from "@/lib/ptbiz-api";

const REMEMBERED_USER_KEY = "ptbiz_selected_user_id";
const JACK_NAME = "jack licata";
const JACK_LOGIN_IMAGE_URL = "https://ca.slack-edge.com/TJ3QQ76KV-U09E8E2JU7N-a11935a3ac5d-512";

// Dev mode bypass
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_PASSWORD = "dev123";

/* ── Tier ordering for section groups ───────────────────────────────────── */

const TIER_ORDER: Record<string, number> = {
  Coaches: 0,
  Partners: 1,
  Advisors: 2,
  "Client Success": 3,
  Acquisitions: 4,
};

const TIER_LABELS: Record<string, string> = {
  Coaches: "Coaches",
  Partners: "Partners",
  Advisors: "Advisors",
  "Client Success": "Client Success",
  Acquisitions: "Acquisitions & Ops",
};

function getTierKey(member: TeamMember): string {
  const section = (member.teamSection || "").trim();
  if (section in TIER_ORDER) return section;
  return "Client Success"; // fallback
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getMemberSortPriority(member: TeamMember) {
  const name = normalizeText(member.name);
  const title = normalizeText(member.title);
  const section = normalizeText(member.teamSection);
  const role = normalizeText(member.role);

  if (name === JACK_NAME) return 99;
  if (section.includes("coach") || title.includes("coach") || role === "coach") return 0;
  if (section.includes("partner") || title.includes("partner")) return 1;
  return 2;
}

function isBoardMember(member: TeamMember) {
  const section = normalizeText(member.teamSection);
  const title = normalizeText(member.title);
  return section.includes("board") || title.includes("board");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resolveImageUrl(member: { name: string; imageUrl?: string | null }) {
  const isJack = normalizeText(member.name) === JACK_NAME;
  return isJack ? JACK_LOGIN_IMAGE_URL : member.imageUrl;
}

/** Split "Danny Matta" → { first: "Danny", last: "Matta" } */
function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/* ── Formatted name component ───────────────────────────────────────────── */

function FormattedName({
  name,
  credentials,
  size = "normal",
}: {
  name: string;
  credentials?: string;
  size?: "normal" | "small" | "large";
}) {
  const { first, last } = splitName(name);
  const sizeClass = size === "small" ? "name-sm" : size === "large" ? "name-lg" : "name-md";

  return (
    <span className={`formatted-name ${sizeClass}`}>
      <span className="formatted-name-first">{first.toUpperCase()}</span>
      {last && <> <span className="formatted-name-last">{last.toUpperCase()}</span></>}
      {credentials && <span className="formatted-name-credentials">, {credentials}</span>}
    </span>
  );
}

/* ── Avatar components ──────────────────────────────────────────────────── */

function TeamAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
}: {
  name: string;
  imageUrl?: string | null;
  className: string;
  fallbackClassName: string;
}) {
  const [didError, setDidError] = useState(false);
  const resolvedImageUrl = resolveImageUrl({ name, imageUrl });

  if (resolvedImageUrl && !didError) {
    return (
      <div className={`team-avatar-shell ${className}-shell`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedImageUrl}
          alt={name}
          className={className}
          loading="lazy"
          onError={() => setDidError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`team-avatar-shell ${className}-shell`}>
      <div className={`${className} ${fallbackClassName}`} aria-label={name}>
        {getInitials(name)}
      </div>
    </div>
  );
}

function saveRecentUser(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("ptbiz_recent_users");
    const recent: string[] = stored ? JSON.parse(stored) : [];
    const updated = [userId, ...recent.filter((id) => id !== userId)].slice(0, 5);
    localStorage.setItem("ptbiz_recent_users", JSON.stringify(updated));
  } catch {
    // ignore localStorage errors
  }
}

/* ── Grouped members type ───────────────────────────────────────────────── */

interface TierGroup {
  tier: string;
  label: string;
  members: TeamMember[];
}

function groupMembersByTier(members: TeamMember[]): TierGroup[] {
  const groups: Record<string, TeamMember[]> = {};

  for (const member of members) {
    const tier = getTierKey(member);
    if (!groups[tier]) groups[tier] = [];
    groups[tier].push(member);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99))
    .map(([tier, tierMembers]) => ({
      tier,
      label: TIER_LABELS[tier] || tier,
      members: tierMembers.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

/* ── Dropdown User Picker ───────────────────────────────────────────────── */

function UserPickerDropdown({
  members,
  selectedUserId,
  onSelect,
}: {
  members: TeamMember[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedUserId) || null,
    [members, selectedUserId],
  );

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.title || "").toLowerCase().includes(q) ||
        (m.teamSection || "").toLowerCase().includes(q) ||
        (getTeamMemberMeta(m.name).clinicName || "").toLowerCase().includes(q) ||
        (getTeamMemberMeta(m.name).credentials || "").toLowerCase().includes(q),
    );
  }, [members, search]);

  const groupedFiltered = useMemo(() => groupMembersByTier(filteredMembers), [filteredMembers]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Auto-focus search when opened
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) setSearch("");
  }, [isOpen]);

  const handleSelect = useCallback(
    (userId: string) => {
      onSelect(userId);
      setIsOpen(false);
      setSearch("");
    },
    [onSelect],
  );

  const selectedMeta = selectedMember ? getTeamMemberMeta(selectedMember.name) : null;

  return (
    <div className="user-picker" ref={dropdownRef}>
      <span className="user-picker-label">Select your profile</span>

      <button
        type="button"
        className={`user-picker-trigger ${isOpen ? "is-open" : ""}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedMember ? (
          <>
            <PickerAvatar member={selectedMember} />
            <div className="user-picker-trigger-text">
              <FormattedName
                name={selectedMember.name}
                credentials={selectedMeta?.credentials}
                size="normal"
              />
              {selectedMeta?.clinicName && (
                <div className="user-picker-trigger-clinic">{selectedMeta.clinicName}</div>
              )}
              {!selectedMeta?.clinicName && (
                <div className="user-picker-trigger-title">
                  {selectedMember.title || "Team Member"}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="user-picker-trigger-placeholder">
              <UserRound size={16} />
            </div>
            <span className="user-picker-trigger-placeholder-text">
              Choose your name...
            </span>
          </>
        )}
        <ChevronDown size={18} className="user-picker-trigger-chevron" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="user-picker-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="listbox"
          >
            <div className="user-picker-search-wrapper" style={{ position: "relative" }}>
              <Search size={15} className="user-picker-search-icon" />
              <input
                ref={searchRef}
                type="text"
                className="user-picker-search"
                placeholder="Search by name, clinic, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="user-picker-list" ref={listRef}>
              {groupedFiltered.length === 0 ? (
                <div className="user-picker-empty">No team members found</div>
              ) : (
                groupedFiltered.map((group) => (
                  <div key={group.tier} className="user-picker-tier-group">
                    <div className="user-picker-tier-header">
                      <span className="user-picker-tier-label">{group.label}</span>
                      <span className="user-picker-tier-count">{group.members.length}</span>
                    </div>
                    {group.members.map((member) => {
                      const meta = getTeamMemberMeta(member.name);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`user-picker-item ${member.id === selectedUserId ? "is-selected" : ""}`}
                          onClick={() => handleSelect(member.id)}
                          role="option"
                          aria-selected={member.id === selectedUserId}
                        >
                          <PickerItemAvatar member={member} />
                          <div className="user-picker-item-info">
                            <FormattedName
                              name={member.name}
                              credentials={meta.credentials}
                              size="small"
                            />
                            {meta.clinicName ? (
                              <div className="user-picker-item-clinic">{meta.clinicName}</div>
                            ) : (
                              <div className="user-picker-item-title">
                                {member.title || "Team Member"}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Small avatar helpers for the picker ────────────────────────────────── */

function PickerAvatar({ member }: { member: TeamMember }) {
  const [didError, setDidError] = useState(false);
  const url = resolveImageUrl(member);

  if (url && !didError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={member.name}
        className="user-picker-trigger-avatar"
        loading="lazy"
        onError={() => setDidError(true)}
      />
    );
  }

  return (
    <div className="user-picker-trigger-avatar-fallback">
      {getInitials(member.name)}
    </div>
  );
}

function PickerItemAvatar({ member }: { member: TeamMember }) {
  const [didError, setDidError] = useState(false);
  const url = resolveImageUrl(member);

  if (url && !didError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={member.name}
        className="user-picker-item-avatar"
        loading="lazy"
        onError={() => setDidError(true)}
      />
    );
  }

  return (
    <div className="user-picker-item-avatar-fallback">
      {getInitials(member.name)}
    </div>
  );
}

/* ── Error state ────────────────────────────────────────────────────────── */

function ErrorState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="login-error-state">
      <h3>Unable to load team members</h3>
      <p>{error?.message || "Something went wrong while loading the team directory."}</p>
      <button onClick={onRetry} className="error-retry-btn">
        Try Again
      </button>
    </div>
  );
}

/* ── Main Login Page ────────────────────────────────────────────────────── */

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading, login } = useSession();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REMEMBERED_USER_KEY);
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const teamQuery = useQuery({
    queryKey: ["auth", "team"],
    queryFn: getTeamMembers,
    staleTime: 60_000,
  });

  const visibleMembers = useMemo(
    () => (teamQuery.data || []).filter((member) => !isBoardMember(member)),
    [teamQuery.data],
  );

  const orderedTeamMembers = useMemo(
    () =>
      [...visibleMembers].sort((a, b) => {
        const priorityDiff = getMemberSortPriority(a) - getMemberSortPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name);
      }),
    [visibleMembers],
  );

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  const selectedUser = useMemo(
    () => visibleMembers.find((member) => member.id === selectedUserId) || null,
    [selectedUserId, visibleMembers],
  );

  const needsFirstTimeSetup = selectedUser ? !selectedUser.hasPassword : false;

  const resetInputs = () => {
    setPassword("");
    setConfirmPassword("");
    setIdentityConfirmed(false);
    setMessage("");
    setShowPassword(false);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    localStorage.setItem(REMEMBERED_USER_KEY, userId);
    saveRecentUser(userId);
    resetInputs();
  };

  const handleBackToSelection = () => {
    setSelectedUserId(null);
    localStorage.removeItem(REMEMBERED_USER_KEY);
    resetInputs();
    setShowSuccess(false);
  };

  const handleSetupPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    if (!identityConfirmed) {
      setMessage("Please confirm you are this person before creating a password.");
      return;
    }

    if (password.length < 4) {
      setMessage("Password must be at least 4 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const result = await setupPassword(selectedUser.id, password);
    if (result.error) {
      setMessage(result.error);
      setSubmitting(false);
      return;
    }

    await teamQuery.refetch();
    setPassword("");
    setConfirmPassword("");
    setIdentityConfirmed(false);
    setMessage("Password saved. Sign in below to continue.");
    setSubmitting(false);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedUser) return;
    if (!password) {
      setMessage("Enter your password to sign in.");
      return;
    }

    if (DEV_MODE && password === DEV_PASSWORD) {
      localStorage.setItem(REMEMBERED_USER_KEY, selectedUser.id);
      saveRecentUser(selectedUser.id);
      setShowSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const result = await login({ userId: selectedUser.id, password, rememberMe });

    if (result.error || !result.user) {
      setMessage(result.error || "Unable to sign in.");
      setSubmitting(false);
      return;
    }

    localStorage.setItem(REMEMBERED_USER_KEY, selectedUser.id);
    saveRecentUser(selectedUser.id);
    setShowSuccess(true);
    setSubmitting(false);

    setTimeout(() => {
      router.replace("/dashboard");
    }, 1500);
  };

  /* ── Loading: session check ───────────────────────────────────────────── */

  if (sessionLoading) {
    return (
      <div className="login-shell">
        <div className="login-hero-spacer" />
        <motion.div className="login-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="login-card-inner">
            <div className="login-loading">
              <div className="login-spinner" />
              <p>Checking session...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Loading: team members ────────────────────────────────────────────── */

  if (teamQuery.isLoading) {
    return (
      <div className="login-shell">
        <div className="login-hero-spacer" />
        <motion.div className="login-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="login-card-inner">
            <div className="skeleton-trigger" />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Error: team load failed ──────────────────────────────────────────── */

  if (teamQuery.error) {
    return (
      <div className="login-shell">
        <div className="login-hero-spacer" />
        <motion.div className="login-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="login-card-inner">
            <ErrorState error={teamQuery.error as Error} onRetry={() => teamQuery.refetch()} />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Derive selected user meta ────────────────────────────────────────── */

  const selectedMeta = selectedUser ? getTeamMemberMeta(selectedUser.name) : null;

  /* ── Main render ──────────────────────────────────────────────────────── */

  return (
    <div className="login-shell">
      {/* Spacer pushes the modal below the background logo */}
      <div className="login-hero-spacer" />

      {/* Login modal card */}
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Decorative wave banner across top of modal */}
        <div className="login-card-wave" aria-hidden="true" />

        <div className="login-card-inner">
          {/* ── Step 1: User picker (no user selected yet) ──────────────── */}
          {!selectedUser && !showSuccess && (
            <section className="member-picker">
              <UserPickerDropdown
                members={orderedTeamMembers}
                selectedUserId={selectedUserId}
                onSelect={handleUserSelect}
              />
            </section>
          )}

          {/* ── Step 2: Auth form (user selected) ───────────────────────── */}
          {selectedUser && !showSuccess && (
            <section className="selected-user-section">
              <button className="change-user-btn" onClick={handleBackToSelection}>
                <ArrowLeft size={14} />
                Choose a different person
              </button>

              <div className="selected-user-card">
                <TeamAvatar
                  name={selectedUser.name}
                  imageUrl={selectedUser.imageUrl}
                  className="selected-user-photo"
                  fallbackClassName="selected-user-photo-fallback"
                />
                <div className="selected-user-card-info">
                  <h2>
                    <FormattedName
                      name={selectedUser.name}
                      credentials={selectedMeta?.credentials}
                      size="large"
                    />
                  </h2>
                  {selectedMeta?.clinicName && (
                    <p className="selected-user-clinic">{selectedMeta.clinicName}</p>
                  )}
                  <span className="selected-user-tier">{selectedUser.teamSection}</span>
                </div>
              </div>

              {needsFirstTimeSetup ? (
                <form className="auth-form" onSubmit={handleSetupPassword}>
                  <h3>First-time setup</h3>
                  <p>Create your password once, then you&apos;ll use your normal sign-in form daily.</p>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={identityConfirmed}
                      onChange={(event) => setIdentityConfirmed(event.target.checked)}
                    />
                    <span>I confirm I am {selectedUser?.name}</span>
                  </label>

                  <div className="password-input-wrapper">
                    <CorexInput
                      label="New password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={submitting}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="password-input-wrapper">
                    <CorexInput
                      label="Confirm password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={submitting}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="auth-trust">
                    <ShieldCheck size={12} />
                    <span>Encrypted &amp; secure team access</span>
                  </div>

                  <CorexButton type="submit" className="login-primary-btn" loading={submitting}>
                    <CheckCircle2 size={16} />
                    Set Password
                  </CorexButton>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleLogin}>
                  <h3>Sign in</h3>
                  <p>Use your saved profile and enter your password.</p>

                  <div className="password-input-wrapper">
                    <CorexInput
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={submitting}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    <span>Stay signed in on this device</span>
                  </label>

                  <div className="auth-trust">
                    <ShieldCheck size={12} />
                    <span>Encrypted &amp; secure team access</span>
                  </div>

                  {DEV_MODE && (
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #666" }}>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem(REMEMBERED_USER_KEY);
                          localStorage.removeItem("ptbiz_recent_users");
                          window.location.reload();
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff6b6b",
                          fontSize: "12px",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        🗑️ Reset Login Data (Dev Only)
                      </button>
                    </div>
                  )}

                  <CorexButton type="submit" className="login-primary-btn" loading={submitting}>
                    <LockKeyhole size={16} />
                    Sign In
                  </CorexButton>
                </form>
              )}
            </section>
          )}

          {/* ── Success state ───────────────────────────────────────────── */}
          {showSuccess && selectedUser && (
            <motion.div
              className="login-success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div className="success-checkmark">
                <CheckCircle2 size={32} />
              </div>
              <p>Welcome back, {selectedUser.name.split(" ")[0]}!</p>
            </motion.div>
          )}

          {/* ── Message / error banner ──────────────────────────────────── */}
          {message && !showSuccess && (
            <div
              className={
                message.toLowerCase().includes("incorrect") || message.toLowerCase().includes("invalid")
                  ? "auth-error"
                  : "login-message"
              }
            >
              <UserRound size={14} />
              <span>{message}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
