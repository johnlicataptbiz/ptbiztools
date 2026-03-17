"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useSession } from "@/lib/auth/session-context";
import {
  getTeamMembers,
  setupPassword,
  type TeamMember,
} from "@/lib/ptbiz-api";
import { getTeamMemberMeta } from "@/constants/team-credentials";

// ============================================================================
// Constants
// ============================================================================

const REMEMBERED_USER_KEY = "ptbiz_selected_user_id";
const JACK_NAME = "jack licata";
const JACK_IMAGE_URL =
  "https://ca.slack-edge.com/TJ3QQ76KV-U09E8E2JU7N-a11935a3ac5d-512";
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_PASSWORD = "dev123";

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

// ============================================================================
// Utility Functions
// ============================================================================

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resolveImageUrl(member: {
  name: string;
  imageUrl?: string | null;
}): string | undefined {
  const isJack = normalizeText(member.name) === JACK_NAME;
  return isJack ? JACK_IMAGE_URL : member.imageUrl || undefined;
}

function getTierKey(member: TeamMember): string {
  const section = (member.teamSection || "").trim();
  return section in TIER_ORDER ? section : "Client Success";
}

function getMemberSortPriority(member: TeamMember): number {
  const name = normalizeText(member.name);
  const title = normalizeText(member.title);
  const section = normalizeText(member.teamSection);

  if (name === JACK_NAME) return 99;
  if (section.includes("coach") || title.includes("coach")) return 0;
  if (section.includes("partner") || title.includes("partner")) return 1;
  return 2;
}

function isBoardMember(member: TeamMember): boolean {
  const section = normalizeText(member.teamSection);
  const title = normalizeText(member.title);
  return section.includes("board") || title.includes("board");
}

function saveRecentUser(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("ptbiz_recent_users");
    const recent: string[] = stored ? JSON.parse(stored) : [];
    const updated = [userId, ...recent.filter((id) => id !== userId)].slice(
      0,
      5,
    );
    localStorage.setItem("ptbiz_recent_users", JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function splitName(name: string): {
  first: string;
  last: string;
} {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * FormattedName — renders first/last/credentials with CSS classes
 */
function FormattedName({
  name,
  credentials,
  size = "sm",
}: {
  name: string;
  credentials?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { first, last } = splitName(name);
  return (
    <span className={`formatted-name name-${size}`}>
      <span className="formatted-name-first">{first}</span>{" "}
      <span className="formatted-name-last">{last}</span>
      {credentials && (
        <span className="formatted-name-credentials">, {credentials}</span>
      )}
    </span>
  );
}

/**
 * UserPicker — branded dropdown for selecting team members
 */
function UserPicker({
  members,
  selectedId,
  onSelect,
}: {
  members: TeamMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => members.find((m) => m.id === selectedId),
    [members, selectedId],
  );

  const selectedMeta = selected ? getTeamMemberMeta(selected.name) : null;

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.title || "").toLowerCase().includes(q) ||
        (m.teamSection || "").toLowerCase().includes(q),
    );
  }, [members, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, TeamMember[]> = {};
    filtered.forEach((m) => {
      const tier = getTierKey(m);
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(m);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99))
      .map(([tier, tierMembers]) => ({
        tier,
        label: TIER_LABELS[tier] || tier,
        members: tierMembers.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
      setSearch("");
    },
    [onSelect],
  );

  const resolvedSelectedUrl = selected
    ? resolveImageUrl(selected)
    : undefined;

  return (
    <div className="user-picker" ref={dropdownRef}>
      <label className="user-picker-label">Select your profile</label>

      {/* ── Trigger button ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`user-picker-trigger${isOpen ? " is-open" : ""}`}
      >
        {selected ? (
          <>
            {resolvedSelectedUrl ? (
              <Image
                src={resolvedSelectedUrl}
                alt={selected.name}
                width={36}
                height={36}
                className="user-picker-trigger-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = (e.target as HTMLImageElement)
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="user-picker-trigger-avatar-fallback"
              style={resolvedSelectedUrl ? { display: "none" } : undefined}
            >
              {getInitials(selected.name)}
            </div>
            <div className="user-picker-trigger-text">
              <div className="user-picker-trigger-name">
                <FormattedName
                  name={selected.name}
                  credentials={selectedMeta?.credentials}
                  size="md"
                />
              </div>
              {selectedMeta?.clinicName && (
                <div className="user-picker-trigger-clinic">
                  {selectedMeta.clinicName}
                </div>
              )}
              {!selectedMeta?.clinicName && selected.title && (
                <div className="user-picker-trigger-title">
                  {selected.title}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="user-picker-trigger-placeholder">
              <User size={18} />
            </div>
            <span className="user-picker-trigger-placeholder-text">
              Choose your name…
            </span>
          </>
        )}
        <ChevronDown size={18} className="user-picker-trigger-chevron" />
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="user-picker-dropdown"
            role="listbox"
          >
            <div className="user-picker-search-wrapper">
              <Search size={15} className="user-picker-search-icon" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, or clinic…"
                className="user-picker-search"
              />
            </div>

            <div className="user-picker-list">
              {grouped.length === 0 ? (
                <div className="user-picker-empty">
                  <Search size={20} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  No team members found
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.tier} className="user-picker-tier-group">
                    <div className="user-picker-tier-header">
                      <span className="user-picker-tier-label">
                        {group.label}
                      </span>
                      <span className="user-picker-tier-count">
                        {group.members.length}
                      </span>
                    </div>
                    {group.members.map((member) => {
                      const meta = getTeamMemberMeta(member.name);
                      const isSelected = member.id === selectedId;
                      const imgUrl = resolveImageUrl(member);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelect(member.id)}
                          role="option"
                          aria-selected={isSelected}
                          className={`user-picker-item${isSelected ? " is-selected" : ""}`}
                        >
                          {imgUrl ? (
                            <Image
                              src={imgUrl}
                              alt={member.name}
                              width={34}
                              height={34}
                              className="user-picker-item-avatar"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                                const fb = (e.target as HTMLImageElement)
                                  .nextElementSibling as HTMLElement;
                                if (fb) fb.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="user-picker-item-avatar-fallback"
                            style={imgUrl ? { display: "none" } : undefined}
                          >
                            {getInitials(member.name)}
                          </div>
                          <div className="user-picker-item-info">
                            <div className="user-picker-item-name">
                              <FormattedName
                                name={member.name}
                                credentials={meta.credentials}
                                size="sm"
                              />
                            </div>
                            <div className="user-picker-item-title">
                              {member.title || "Team Member"}
                            </div>
                            {meta.clinicName && (
                              <div className="user-picker-item-clinic">
                                {meta.clinicName}
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

// ============================================================================
// Main Page Component
// ============================================================================

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading, login } = useSession();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REMEMBERED_USER_KEY);
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
        const priorityDiff =
          getMemberSortPriority(a) - getMemberSortPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name);
      }),
    [visibleMembers],
  );

  const selectedUser = useMemo(
    () =>
      visibleMembers.find((member) => member.id === selectedUserId) || null,
    [selectedUserId, visibleMembers],
  );

  const needsFirstTimeSetup = selectedUser ? !selectedUser.hasPassword : false;
  const selectedMeta = selectedUser
    ? getTeamMemberMeta(selectedUser.name)
    : null;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  const resetInputs = () => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIdentityConfirmed(false);
    setMessage("");
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
      setMessage(
        "Please confirm you are this person before creating a password.",
      );
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
    resetInputs();
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

    // Dev mode bypass
    if (DEV_MODE && password === DEV_PASSWORD) {
      localStorage.setItem(REMEMBERED_USER_KEY, selectedUser.id);
      saveRecentUser(selectedUser.id);
      setShowSuccess(true);
      setTimeout(() => router.replace("/dashboard"), 1500);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const result = await login({
      userId: selectedUser.id,
      password,
      rememberMe,
    });

    if (result.error || !result.user) {
      setMessage(result.error || "Unable to sign in.");
      setSubmitting(false);
      return;
    }

    localStorage.setItem(REMEMBERED_USER_KEY, selectedUser.id);
    saveRecentUser(selectedUser.id);
    setShowSuccess(true);
    setSubmitting(false);
    setTimeout(() => router.replace("/dashboard"), 1500);
  };

  // ── Loading: checking session ──────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="login-shell">
        <div className="login-hero-spacer" />
        <div className="login-card">
          <div className="login-card-inner">
            <div className="login-loading">
              <div className="login-spinner" />
              <span>Checking session…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading: fetching team ─────────────────────────────────────────────
  if (teamQuery.isLoading) {
    return (
      <div className="login-shell">
        <div className="login-hero-spacer" />
        <div className="login-card">
          <div className="login-card-inner">
            <div className="login-loading">
              <div className="login-spinner" />
              <span>Loading team…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error: team fetch failed ───────────────────────────────────────────
  if (teamQuery.error) {
    return (
      <div className="login-shell">
        <div className="login-hero-spacer" />
        <div className="login-card">
          <div className="login-card-inner">
            <div className="login-error-state">
              <AlertCircle size={32} style={{ color: "#f87171" }} />
              <h3>Unable to load team</h3>
              <p>
                {(teamQuery.error as Error).message ||
                  "Something went wrong while loading the team directory."}
              </p>
              <button
                className="error-retry-btn"
                onClick={() => teamQuery.refetch()}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Resolve selected user image ────────────────────────────────────────
  const selectedImgUrl = selectedUser
    ? resolveImageUrl(selectedUser)
    : undefined;

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div className="login-shell">
      <div className="login-hero-spacer" />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-card-inner">
          <AnimatePresence mode="wait">
            {/* ════════════════════════════════════════════════════════════
                SUCCESS STATE
               ════════════════════════════════════════════════════════════ */}
            {showSuccess && selectedUser ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="login-success"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.15,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="success-checkmark"
                >
                  <CheckCircle2 size={28} />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Welcome back, {splitName(selectedUser.name).first}!
                </motion.p>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 0.5 }}
                  style={{ fontSize: 13, color: "#94a3b8" }}
                >
                  Redirecting to dashboard…
                </motion.span>
              </motion.div>

            ) : !selectedUser ? (
              /* ════════════════════════════════════════════════════════════
                  USER SELECTION STEP — no user selected yet
                 ════════════════════════════════════════════════════════════ */
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="member-picker"
              >
                <UserPicker
                  members={orderedTeamMembers}
                  selectedId={selectedUserId}
                  onSelect={handleUserSelect}
                />
              </motion.div>

            ) : needsFirstTimeSetup ? (
              /* ════════════════════════════════════════════════════════════
                  FIRST-TIME PASSWORD SETUP
                 ════════════════════════════════════════════════════════════ */
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="selected-user-section"
              >
                {/* Selected user card */}
                <div className="selected-user-card">
                  <div className="selected-user-photo-shell">
                    {selectedImgUrl ? (
                      <Image
                        src={selectedImgUrl}
                        alt={selectedUser.name}
                        width={38}
                        height={38}
                        className="selected-user-photo"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const fb = (e.target as HTMLImageElement)
                            .nextElementSibling as HTMLElement;
                          if (fb) fb.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="selected-user-photo-fallback"
                      style={selectedImgUrl ? { display: "none" } : undefined}
                    >
                      {getInitials(selectedUser.name)}
                    </div>
                  </div>
                  <div>
                    <h2>
                      <FormattedName
                        name={selectedUser.name}
                        credentials={selectedMeta?.credentials}
                        size="md"
                      />
                    </h2>
                    {selectedMeta?.clinicName ? (
                      <p className="selected-user-clinic">
                        {selectedMeta.clinicName}
                      </p>
                    ) : selectedUser.title ? (
                      <p>{selectedUser.title}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="change-user-btn"
                  onClick={handleBackToSelection}
                >
                  <ArrowLeft size={14} />
                  Switch user
                </button>

                {/* Setup form */}
                <form className="auth-form" onSubmit={handleSetupPassword}>
                  <h3>Create your password</h3>
                  <p>
                    First time here? Create a password to secure your account.
                  </p>

                  {/* Identity confirmation */}
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={identityConfirmed}
                      onChange={(e) => setIdentityConfirmed(e.target.checked)}
                    />
                    I confirm I am {splitName(selectedUser.name).first}
                  </label>

                  {/* New password */}
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Confirm password */}
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {/* Message */}
                  {message && (
                    <div className="auth-error">
                      <AlertCircle size={16} />
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="login-primary-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={18}
                          style={{
                            animation: "spin 0.9s linear infinite",
                            marginRight: 8,
                          }}
                        />
                        Saving…
                      </>
                    ) : (
                      "Create Password"
                    )}
                  </button>
                </form>
              </motion.div>

            ) : (
              /* ════════════════════════════════════════════════════════════
                  LOGIN FORM — user has password
                 ════════════════════════════════════════════════════════════ */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="selected-user-section"
              >
                <div className="selected-user-card">
                  <div className="selected-user-photo-shell">
                    {selectedImgUrl ? (
                      <Image
                        src={selectedImgUrl}
                        alt={selectedUser.name}
                        width={38}
                        height={38}
                        className="selected-user-photo"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                          if (fb) fb.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="selected-user-photo-fallback"
                      style={selectedImgUrl ? { display: "none" } : undefined}
                    >
                      {getInitials(selectedUser.name)}
                    </div>
                  </div>
                  <div>
                    <h2>
                      <FormattedName
                        name={selectedUser.name}
                        credentials={selectedMeta?.credentials}
                        size="md"
                      />
                    </h2>
                    {selectedMeta?.clinicName ? (
                      <p className="selected-user-clinic">{selectedMeta.clinicName}</p>
                    ) : selectedUser.title ? (
                      <p>{selectedUser.title}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="change-user-btn"
                  onClick={handleBackToSelection}
                >
                  <ArrowLeft size={14} />
                  Switch user
                </button>

                <form className="auth-form" onSubmit={handleLogin}>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>

                  {message && (
                    <div className="auth-error">
                      <AlertCircle size={16} />
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="login-primary-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={18}
                          style={{ animation: "spin 0.9s linear infinite", marginRight: 8 }}
                        />
                        Signing in…
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
