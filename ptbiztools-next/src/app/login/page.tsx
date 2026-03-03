"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, LockKeyhole, Palette, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { LOGIN_LOGO_URL } from "@/constants/branding";
import { CorexButton, CorexInput } from "@/components/corex/CorexComponents";
import { useSession } from "@/lib/auth/session-context";
import { useTheme } from "@/lib/theme/theme-context";
import { getTeamMembers, setupPassword, type TeamMember } from "@/lib/ptbiz-api";

const REMEMBERED_USER_KEY = "ptbiz_selected_user_id";
const JACK_NAME = "jack licata";

const MEMBER_PROFILES_BY_NAME: Record<string, { badge: string; credentials: string; clinic: string; experience: string }> = {
  "ashley speights": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder & Owner — The PHYT Collective (Washington, DC)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "brooke miller": {
    badge: "OWNER",
    credentials: "Coach; PT clinic owner",
    clinic: "Owner — PeakRx Therapy / PeakRx PT & Wellness (Dallas/Lewisville, TX)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "chris robl": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder/Owner — Physio Room (multiple Colorado locations; hybrid model)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "colleen davis": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder & Owner — GOAT Physical Therapy and Wellness (Gales Ferry, CT)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "courtney morse": {
    badge: "OWNER",
    credentials: "Head Coach; PT clinic owner/founder",
    clinic: "Owner/Founder — Natural Wellness Physiotherapy (Wichita, KS; cash-based, team-run)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "daniel laughlin": {
    badge: "OWNER",
    credentials: "Coach; PT clinic owner",
    clinic: "Owner — Laughlin Performance & Physical Therapy (Overland Park, KS; hybrid model)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "dj haskins": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder",
    clinic: "Founder — Bliss Pelvic Health (Tampa Bay/Wesley Chapel, FL)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "elizabeth rudd": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder/Owner — Well Equipt Physical Therapy (Atlanta, GA; founded 2018)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "jaxie meth": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder/Owner — The METHOD Performance and Physical Therapy (Boston, MA area)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "michael sclafani": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder/Owner — Tideline Sports Performance & Rehabilitation (Sarasota/Bradenton, FL area)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "tyler humphries": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder/Owner — Bulletproof Physical Therapy (Houston, TX)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "ziad dahdul": {
    badge: "OWNER",
    credentials: "Coach; PT clinic founder/owner",
    clinic: "Founder/Owner — Ignite Phyzio & Sports Performance (Orange County/La Habra, CA)",
    experience: "Owns/founded successful cash-based or hybrid PT clinic",
  },
  "danny matta": {
    badge: "OWNER",
    credentials: "Partner; CEO",
    clinic: "Co-founder/Co-owner (with Ashley Matta) — Athletes' Potential (Decatur/Atlanta, GA)",
    experience: "Scaled to largest cash-based PT in Georgia; clinic sold in 2023",
  },
  "yves gege": {
    badge: "OWNER",
    credentials: "Partner; Head of Customer Success & Coaching",
    clinic: "Founder — Made 2 Move Physical Therapy (Charleston, SC area)",
    experience: "Grew to multiple locations/providers; sold in 2020; remains mentor",
  },
  "jerred moon": {
    badge: "BIZ",
    credentials: "Partner; CFO",
    clinic: "No PT clinic ownership",
    experience: "Owner, End of Three Fitness (7-figure digital fitness business)",
  },
  "john licata": {
    badge: "BIZ",
    credentials: "Advisor; Senior Advisor",
    clinic: "Senior Advisor",
    experience: "No PT clinic ownership; 30+ years in consumer goods/executive consulting",
  },
  "toni counts": {
    badge: "OWNER",
    credentials: "Advisor; Business Advisor",
    clinic: "Founder/Owner — Off The Block Performance Physical Therapy (Central/Easley, SC area)",
    experience: "Multiple locations with husband Cole",
  },
  "amy gege": {
    badge: "OPER",
    credentials: "Client Success; events/operations",
    clinic: "No PT clinic ownership",
    experience: "Operations role; married to Yves Gege",
  },
  "ashley matta": {
    badge: "OWNER",
    credentials: "Client Success; First Lady of PT Biz",
    clinic: "Co-owner (with Danny Matta) — Athletes' Potential",
    experience: "Clinic sold in 2023",
  },
  "bekah fay": {
    badge: "OWNER",
    credentials: "Client Success; Acquisitions",
    clinic: "Opened cash-based PT practice inside CrossFit affiliate she owns (South Florida)",
    experience: "PT clinic owner + acquisitions role",
  },
  "brandon erwin": {
    badge: "OPER",
    credentials: "Client Success",
    clinic: "No PT clinic ownership",
    experience: "Business/operations background",
  },
  "nicole miller": {
    badge: "OPER",
    credentials: "Client Success; Acquisitions",
    clinic: "No PT clinic ownership",
    experience: "DPT with business-role focus only",
  },
  "e'an verdugo": {
    badge: "OPER",
    credentials: "Acquisitions; Creative Director",
    clinic: "No PT clinic ownership",
    experience: "Business/creative operations background",
  },
  "justin pfluger": {
    badge: "OPER",
    credentials: "Acquisitions",
    clinic: "No PT clinic ownership",
    experience: "Business/operations background",
  },
  "kaitlin wilcox": {
    badge: "OPER",
    credentials: "Acquisitions",
    clinic: "No PT clinic ownership",
    experience: "Business/operations background",
  },
  "trampis beatty": {
    badge: "OPER",
    credentials: "Acquisitions",
    clinic: "No PT clinic ownership",
    experience: "Business/operations background",
  },
  "jack licata": {
    badge: "OPER",
    credentials: "Client Success / Acquisitions",
    clinic: "No PT clinic ownership",
    experience: "Business/operations background",
  },
};

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

function getMemberProfile(member: TeamMember) {
  const explicit = MEMBER_PROFILES_BY_NAME[normalizeText(member.name)];
  if (explicit) {
    return sanitizeProfile(explicit);
  }

  const section = normalizeText(member.teamSection);
  const isCoach = section.includes("coach");
  const isPartner = section.includes("partner");
  const isAdvisor = section.includes("advisor");

  if (isCoach) {
    return sanitizeProfile({
      badge: "OWNER",
      credentials: "Coach profile",
      clinic: "PT clinic founder/owner",
      experience: "Cash-based or hybrid practice builder",
    });
  }

  if (isPartner) {
    return sanitizeProfile({
      badge: "LEAD",
      credentials: "Partner leadership profile",
      clinic: member.title || "PT Biz Partner",
      experience: "Executive and operations leadership",
    });
  }

  if (isAdvisor) {
    return sanitizeProfile({
      badge: "ADVR",
      credentials: "Advisor profile",
      clinic: member.title || "PT Biz Advisor",
      experience: "Advisory and business strategy",
    });
  }

  return sanitizeProfile({
    badge: "OPER",
    credentials: "Team profile",
    clinic: "No PT clinic ownership listed",
    experience: member.title || "Internal operations and client success",
  });
}

function sanitizeProfile(profile: { badge: string; credentials: string; clinic: string; experience: string }) {
  if (profile.badge !== "OPER") return profile;

  const clinic = /^no pt clinic ownership/i.test(profile.clinic.trim()) ? "" : profile.clinic;
  const experience = profile.experience
    .replace(/\bNo PT clinic ownership\b;?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    ...profile,
    clinic,
    experience,
  };
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
  credentialBadge,
  className,
  fallbackClassName,
}: {
  name: string;
  imageUrl?: string | null;
  credentialBadge?: string;
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
        {credentialBadge && (
          <span className="team-avatar-badge" aria-label={`Credential ${credentialBadge}`} title={credentialBadge}>
            {credentialBadge}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`team-avatar-shell ${className}-shell`}>
      <div className={`${className} ${fallbackClassName}`} aria-label={name}>
        {getInitials(name)}
      </div>
      {credentialBadge && (
        <span className="team-avatar-badge" aria-label={`Credential ${credentialBadge}`} title={credentialBadge}>
          {credentialBadge}
        </span>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading, login } = useSession();
  const { theme, setTheme, options } = useTheme();

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
  const selectedUserProfile = selectedUser ? getMemberProfile(selectedUser) : null;

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
          <div className="login-theme-row">
            <label className="login-theme-control">
              <span className="login-theme-label">
                <Palette size={13} />
                Theme
              </span>
              <select
                className="login-theme-select"
                value={theme}
                onChange={(event) => setTheme(event.target.value as typeof theme)}
                aria-label="Select theme"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
              {orderedTeamMembers.map((member) => {
                const profile = getMemberProfile(member);

                return (
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
                        credentialBadge={profile.badge}
                        className="member-list-photo"
                        fallbackClassName="member-list-photo-fallback"
                      />
                      <div className="member-row-meta">
                        <strong>{member.name}</strong>
                        <span>{member.title || "Team Member"}</span>
                        <em>{member.teamSection || "PT Biz Team"}</em>
                        <small className="member-row-cred">{profile.credentials}</small>
                        {profile.clinic && <small className="member-row-context">{profile.clinic}</small>}
                        {profile.experience && <small className="member-row-context">{profile.experience}</small>}
                      </div>
                    <div className="member-row-action" aria-hidden="true">
                      Select
                    </div>
                  </motion.button>
                );
              })}
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
                credentialBadge={selectedUserProfile?.badge}
                className="selected-user-photo"
                fallbackClassName="selected-user-photo-fallback"
              />
              <div>
                <h2>{selectedUser.name}</h2>
                <p>{selectedUser.title}</p>
                <span>{selectedUser.teamSection}</span>
                {selectedUserProfile && (
                  <>
                    <small className="selected-user-cred">{selectedUserProfile.credentials}</small>
                    {selectedUserProfile.clinic && (
                      <small className="selected-user-context">{selectedUserProfile.clinic}</small>
                    )}
                    {selectedUserProfile.experience && (
                      <small className="selected-user-context">{selectedUserProfile.experience}</small>
                    )}
                  </>
                )}
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
