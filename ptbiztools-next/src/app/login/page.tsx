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

const MEMBER_PROFILES_BY_NAME: Record<string, { badge: string; credentials: string; clinic: string; experience: string }> = {
  "ashley speights": {
    badge: "DPT",
    credentials: "PT, DPT (Duke University), PES",
    clinic: "Cash/hybrid PT clinic owner",
    experience: "Clinical coaching leader in PTBiz network",
  },
  "brooke miller": {
    badge: "OCS",
    credentials: "PT, DPT, OCS",
    clinic: "Cash/hybrid PT clinic owner",
    experience: "Pelvic health and orthopedic specialist",
  },
  "chris robl": {
    badge: "DPT",
    credentials: "DPT (Doctorate of Physical Therapy, 2011)",
    clinic: "Cash/hybrid PT clinic owner",
    experience: "10+ years clinical experience",
  },
  "colleen davis": {
    badge: "DPT",
    credentials: "DPT",
    clinic: "Founder of GOAT Physical Therapy & Wellness",
    experience: "Clinical coaching leader in PTBiz network",
  },
  "courtney morse": {
    badge: "DPT",
    credentials: "DPT (Wichita State University, 2011)",
    clinic: "Founder of Natural Wellness Physiotherapy",
    experience: "Clinical coaching leader in PTBiz network",
  },
  "daniel laughlin": {
    badge: "DPT",
    credentials: "PT, DPT (Rockhurst University); SFMA; Certified Functional Dry Needling",
    clinic: "Cash/hybrid PT clinic owner",
    experience: "Clinical coaching leader in PTBiz network",
  },
  "dj haskins": {
    badge: "DPT",
    credentials: "PT, DPT",
    clinic: "Founder of Bliss Pelvic Health",
    experience: "Pelvic health specialist",
  },
  "elizabeth rudd": {
    badge: "OCS",
    credentials: "PT, DPT, OCS, CSCS (Columbia University)",
    clinic: "Founder of Well Equipt",
    experience: "Clinical coaching leader in PTBiz network",
  },
  "jaxie meth": {
    badge: "DPT",
    credentials: "PT, DPT",
    clinic: "Founder of The METHOD Performance & Physical Therapy",
    experience: "Pelvic floor specialist",
  },
  "michael sclafani": {
    badge: "SCS",
    credentials: "DPT, SCS, CSCS, USAW",
    clinic: "Cash/hybrid PT clinic owner",
    experience: "Sports Residency at Cleveland Clinic; published researcher; DPT faculty",
  },
  "tyler humphries": {
    badge: "DPT",
    credentials: "DPT (Old Dominion University); TPI; Blood Flow Restriction certified",
    clinic: "Founder of Bulletproof Physical Therapy",
    experience: "Clinical coaching leader in PTBiz network",
  },
  "ziad dahdul": {
    badge: "OCS",
    credentials: "DPT (University of Southern California); OCS, SFMA, FRCms",
    clinic: "Cash/hybrid PT clinic owner",
    experience: "11+ years with athletes from youth to professional",
  },
  "danny matta": {
    badge: "OCS",
    credentials: "DPT, OCS, CSCS",
    clinic: "PT Biz CEO",
    experience: "Former U.S. Army Physical Therapist",
  },
  "yves gege": {
    badge: "PT",
    credentials: "PT (DPT-level training)",
    clinic: "Founder of Made 2 Move Physical Therapy",
    experience: "Head of Customer Success & Coaching",
  },
  "jerred moon": {
    badge: "BUS",
    credentials: "No clinical credentials",
    clinic: "PT Biz CFO",
    experience: "Business strategist and Air Force veteran",
  },
  "john licata": {
    badge: "BUS",
    credentials: "No clinical credentials",
    clinic: "Senior Advisor",
    experience: "30+ years consumer goods executive and consultant",
  },
  "toni counts": {
    badge: "DPT",
    credentials: "PT, DPT",
    clinic: "Founder of Off The Block Performance Physical Therapy",
    experience: "Business Advisor",
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
  if (explicit) return explicit;

  const section = normalizeText(member.teamSection);
  const isCoach = section.includes("coach");
  const isPartner = section.includes("partner");
  const isAdvisor = section.includes("advisor");

  if (isCoach) {
    return {
      badge: "DPT",
      credentials: "PT, DPT (licensed physical therapist)",
      clinic: "Cash/hybrid PT clinic owner",
      experience: "Clinical coaching leader in PTBiz network",
    };
  }

  if (isPartner) {
    return {
      badge: "LEAD",
      credentials: "Partner leadership profile",
      clinic: member.title || "PT Biz Partner",
      experience: "Executive and operations leadership",
    };
  }

  if (isAdvisor) {
    return {
      badge: "ADVR",
      credentials: "Advisor profile",
      clinic: member.title || "PT Biz Advisor",
      experience: "Advisory and business strategy",
    };
  }

  return {
    badge: "TEAM",
    credentials: "Team profile",
    clinic: member.title || "PT Biz Team",
    experience: "Internal operations and client success",
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
                        <small className="member-row-context">{profile.clinic}</small>
                        <small className="member-row-context">{profile.experience}</small>
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
                    <small className="selected-user-context">{selectedUserProfile.clinic}</small>
                    <small className="selected-user-context">{selectedUserProfile.experience}</small>
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
