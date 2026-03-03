"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { LOGIN_LOGO_URL } from "@/constants/branding";
import { CorexButton, CorexInput } from "@/components/corex/CorexComponents";
import { useSession } from "@/lib/auth/session-context";
import { getTeamMembers, setupPassword, type TeamMember } from "@/lib/ptbiz-api";

const REMEMBERED_USER_KEY = "ptbiz_selected_user_id";
const JACK_NAME = "jack licata";
const PT_BADGE_NAME_ALLOWLIST = new Set(["danny matta", "yves gege", "toni counts"]);

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

function isCoachMember(member: TeamMember) {
  const section = normalizeText(member.teamSection);
  const title = normalizeText(member.title);
  const role = normalizeText(member.role);
  return section.includes("coach") || title.includes("coach") || role.includes("coach");
}

function shouldShowPtBadge(member: TeamMember) {
  const normalizedName = normalizeText(member.name);
  if (PT_BADGE_NAME_ALLOWLIST.has(normalizedName)) return true;
  return isCoachMember(member);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamAvatar({
  name,
  imageUrl,
  showPtBadge,
  className,
  fallbackClassName,
}: {
  name: string;
  imageUrl?: string | null;
  showPtBadge: boolean;
  className: string;
  fallbackClassName: string;
}) {
  const [didError, setDidError] = useState(false);
  const isJack = normalizeText(name) === JACK_NAME;
  const imageClassName = `${className}${isJack ? " jack-headshot-tight" : ""}`;

  if (imageUrl && !didError) {
    return (
      <div className={`team-avatar-shell ${className}-shell`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className={imageClassName}
          loading="lazy"
          onError={() => setDidError(true)}
        />
        {showPtBadge && <span className="team-avatar-badge" aria-hidden="true">PT</span>}
      </div>
    );
  }

  return (
    <div className={`team-avatar-shell ${className}-shell`}>
      <div className={`${className} ${fallbackClassName}`} aria-label={name}>
        {getInitials(name)}
      </div>
      {showPtBadge && <span className="team-avatar-badge" aria-hidden="true">PT</span>}
    </div>
  );
}

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
    () => [...visibleMembers].sort((a, b) => {
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
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    localStorage.setItem(REMEMBERED_USER_KEY, userId);
    resetInputs();
  };

  const handleBackToSelection = () => {
    setSelectedUserId(null);
    localStorage.removeItem(REMEMBERED_USER_KEY);
    resetInputs();
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

    setSubmitting(true);
    setMessage("");

    const result = await login({ userId: selectedUser.id, password, rememberMe });

    if (result.error || !result.user) {
      setMessage(result.error || "Unable to sign in.");
      setSubmitting(false);
      return;
    }

    localStorage.setItem(REMEMBERED_USER_KEY, selectedUser.id);
    router.replace("/dashboard");
  };

  if (sessionLoading || teamQuery.isLoading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <p>Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <header className="login-header">
          <div className="login-logo-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="login-logo-image" src={LOGIN_LOGO_URL} alt="PTBizCoach" />
          </div>
          <h1>Sign in</h1>
          <p>Select your profile and enter your password.</p>
        </header>

        {!selectedUser && (
          <section className="member-picker">
            <div className="member-picker-header">
              <h2>Choose your profile</h2>
              <span>{orderedTeamMembers.length} team members</span>
            </div>
            <div className="member-dropdown-list" role="listbox" aria-label="Team member profiles">
              {orderedTeamMembers.map((member) => (
                <motion.button
                  key={member.id}
                  className="member-row-card"
                  onClick={() => handleUserSelect(member.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.995 }}
                >
                  <TeamAvatar
                    name={member.name}
                    imageUrl={member.imageUrl}
                    showPtBadge={shouldShowPtBadge(member)}
                    className="member-list-photo"
                    fallbackClassName="member-list-photo-fallback"
                  />
                  <div className="member-row-meta">
                    <strong>{member.name}</strong>
                    <span>{member.title || "Team Member"}</span>
                    <em>{member.teamSection || "PT Biz Team"}</em>
                  </div>
                  <div className="member-row-action" aria-hidden="true">
                    Select
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {selectedUser && (
          <section className="selected-user-section">
            <button className="change-user-btn" onClick={handleBackToSelection}>
              <ArrowLeft size={14} />
              Choose a different person
            </button>

            <div className="selected-user-card">
              <TeamAvatar
                name={selectedUser.name}
                imageUrl={selectedUser.imageUrl}
                showPtBadge={shouldShowPtBadge(selectedUser)}
                className="selected-user-photo"
                fallbackClassName="selected-user-photo-fallback"
              />
              <div>
                <h2>{selectedUser.name}</h2>
                <p>{selectedUser.title}</p>
                <span>{selectedUser.teamSection}</span>
              </div>
            </div>

            {needsFirstTimeSetup ? (
              <form className="auth-form" onSubmit={handleSetupPassword}>
                <h3>First-time setup</h3>
                <p>Create your password once, then you'll use your normal sign-in form daily.</p>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(event) => setIdentityConfirmed(event.target.checked)}
                  />
                  <span>I confirm I am {selectedUser.name}</span>
                </label>

                <CorexInput
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />

                <CorexInput
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={submitting}
                />

                <CorexButton type="submit" className="login-primary-btn" loading={submitting}>
                  <CheckCircle2 size={16} />
                  Set Password
                </CorexButton>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                <h3>Sign in</h3>
                <p>Use your saved profile and enter your password.</p>

                <CorexInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Keep me logged in</span>
                </label>

                <CorexButton type="submit" className="login-primary-btn" loading={submitting}>
                  <LockKeyhole size={16} />
                  Sign In
                </CorexButton>
              </form>
            )}
          </section>
        )}

        {message && (
          <div className="login-message">
            <UserRound size={14} />
            <span>{message}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
