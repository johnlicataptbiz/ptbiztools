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
const JACK_LOGIN_IMAGE_URL = "https://ca.slack-edge.com/TJ3QQ76KV-U09E8E2JU7N-a11935a3ac5d-512";

type MemberProfile = {
  badge: string;
  credentials: string;
  clinic: string;
  experience: string;
  clinicLogoUrl?: string;
};

const MEMBER_PROFILES_BY_NAME: Record<string, MemberProfile> = {
  "ashley speights": {
    badge: "PT,DPT",
    credentials: "Coach; PT, DPT, PES",
    clinic: "Founder & Owner — The PHYT Collective (Washington, DC)",
    experience: "Athlete-focused cash practice with strong community education",
    clinicLogoUrl: "https://logos.hunter.io/phytcollective.com",
  },
  "brooke miller": {
    badge: "DPT,OCS",
    credentials: "Coach; PT, DPT, OCS",
    clinic: "Owner — PeakRx Therapy / PeakRx PT & Wellness (Dallas/Lewisville, TX)",
    experience: "Pelvic health + orthopedic performance specialist clinic owner",
    clinicLogoUrl: "https://logos.hunter.io/peakrxtherapy.com",
  },
  "chris robl": {
    badge: "DPT",
    credentials: "Coach; DPT",
    clinic: "Founder/Owner — Physio Room (Colorado; hybrid model)",
    experience: "10+ years clinical practice; built multi-location hybrid business",
    clinicLogoUrl: "https://logos.hunter.io/physioroomco.com",
  },
  "colleen davis": {
    badge: "DPT",
    credentials: "Coach; DPT",
    clinic: "Founder & Owner — GOAT Physical Therapy and Wellness (Gales Ferry, CT)",
    experience: "Scaled to a 3,500 sq ft clinic with four therapists",
    clinicLogoUrl: "https://logos.hunter.io/goatpt.com",
  },
  "courtney morse": {
    badge: "DPT",
    credentials: "Head Coach; DPT",
    clinic: "Owner/Founder — Natural Wellness Physiotherapy (Wichita, KS)",
    experience: "Built team-run cash clinic and now focuses on systems + leadership",
    clinicLogoUrl: "https://logos.hunter.io/teamnaturalwellness.com",
  },
  "daniel laughlin": {
    badge: "PT,DPT",
    credentials: "Coach; PT, DPT",
    clinic: "Owner — Laughlin Performance & Physical Therapy (Overland Park, KS; hybrid model)",
    experience: "Converted from insurance model to high-performing hybrid practice",
    clinicLogoUrl: "https://logos.hunter.io/lpptkc.com",
  },
  "dj haskins": {
    badge: "PT,DPT",
    credentials: "Coach; PT, DPT",
    clinic: "Founder — Bliss Pelvic Health (Tampa Bay/Wesley Chapel, FL)",
    experience: "Pelvic health practice helping women return to confident movement",
    clinicLogoUrl: "https://logos.hunter.io/blisspelvichealth.com",
  },
  "elizabeth rudd": {
    badge: "DPT,OCS",
    credentials: "Coach; PT, DPT, OCS, CSCS",
    clinic: "Founder/Owner — Well Equipt Physical Therapy (Atlanta, GA; founded 2018)",
    experience: "Sports performance, rehab, and pain-management specialist",
    clinicLogoUrl: "https://logos.hunter.io/wellequiptpt.com",
  },
  "jaxie meth": {
    badge: "PT,DPT",
    credentials: "Coach; PT, DPT",
    clinic: "Founder/Owner — The METHOD Performance and Physical Therapy (Boston, MA area)",
    experience: "Pelvic floor specialist for fitness athletes",
    clinicLogoUrl: "https://logos.hunter.io/themethodpt.com",
  },
  "michael sclafani": {
    badge: "DPT,SCS",
    credentials: "Coach; DPT, SCS, CSCS",
    clinic: "Founder/Owner — Tideline Sports Performance & Rehabilitation (Sarasota/Bradenton, FL area)",
    experience: "Sports residency trained; published IJSPT author; DPT faculty contributor",
    clinicLogoUrl: "https://logos.hunter.io/tidelinesportsperformance.com",
  },
  "tyler humphries": {
    badge: "DPT",
    credentials: "Coach; DPT",
    clinic: "Founder/Owner — Bulletproof Physical Therapy (Houston, TX)",
    experience: "Performance-based rehab model for active adults and athletes",
    clinicLogoUrl: "https://logos.hunter.io/bulletproofpt.com",
  },
  "ziad dahdul": {
    badge: "DPT,OCS",
    credentials: "Coach; DPT, OCS",
    clinic: "Founder/Owner — Ignite Phyzio & Sports Performance (Orange County/La Habra, CA)",
    experience: "11+ years with athletes; USC DPT; functional performance focus",
    clinicLogoUrl: "https://logos.hunter.io/ignitephyzio.com",
  },
  "danny matta": {
    badge: "DPT,OCS",
    credentials: "Partner; CEO; DPT, OCS, CSCS",
    clinic: "Co-founder/Co-owner (with Ashley Matta) — Athletes' Potential (Decatur/Atlanta, GA)",
    experience: "Former U.S. Army Physical Therapist; co-founded PT Biz and scaled Athletes' Potential before selling in 2023",
  },
  "yves gege": {
    badge: "PT",
    credentials: "Partner; Head of Customer Success & Coaching; PT",
    clinic: "Founder — Made 2 Move Physical Therapy (Charleston, SC area)",
    experience: "Grew to multiple locations/providers; sold in 2020; remains mentor",
    clinicLogoUrl: "https://logos.hunter.io/made2movept.com",
  },
  "jerred moon": {
    badge: "BIZ",
    credentials: "Partner; CFO",
    clinic: "",
    experience: "PT Biz CFO + acquisitions leader; USAF veteran; 8-figure digital operator; author of Killing Comfort",
  },
  "john licata": {
    badge: "BIZ",
    credentials: "Advisor; Senior Advisor",
    clinic: "Senior Advisor — PT Biz",
    experience: "30+ years in consumer goods leadership, sales strategy, and executive consulting",
  },
  "toni counts": {
    badge: "PT,DPT",
    credentials: "Advisor; Business Advisor; PT, DPT",
    clinic: "Founder/Owner — Off The Block Performance Physical Therapy (Central/Easley, SC area)",
    experience: "Multiple locations with husband Cole",
    clinicLogoUrl: "https://logos.hunter.io/offtheblockpt.com",
  },
  "amy gege": {
    badge: "OPS",
    credentials: "Client Success; Events & Operations",
    clinic: "",
    experience: "20+ years event operations; coordinates PT Biz live experiences",
  },
  "ashley matta": {
    badge: "OWNER",
    credentials: "Client Success; First Lady of PT Biz",
    clinic: "Co-owner (with Danny Matta) — Athletes' Potential",
    experience: "Built and operated cash practice for 8+ years; sold in 2023",
    clinicLogoUrl: "https://logos.hunter.io/athletespotential.com",
  },
  "bekah fay": {
    badge: "DPT",
    credentials: "Client Success; Acquisitions; DPT",
    clinic: "Opened cash-based PT practice inside CrossFit affiliate she owns (South Florida)",
    experience: "CrossFit affiliate owner who launched and runs cash PT practice",
  },
  "brandon erwin": {
    badge: "OPS",
    credentials: "Client Success",
    clinic: "",
    experience: "Podcast production plus digital marketing and sales support",
  },
  "nicole miller": {
    badge: "DPT",
    credentials: "Client Success; Acquisitions; DPT",
    clinic: "",
    experience: "Outpatient neuro background; movement, education, and operations focus",
  },
  "e'an verdugo": {
    badge: "OPS",
    credentials: "Acquisitions; Creative Director",
    clinic: "",
    experience: "Filmmaker and storyteller leading PT Biz creative direction",
  },
  "justin pfluger": {
    badge: "OPS",
    credentials: "Acquisitions",
    clinic: "",
    experience: "Ecommerce operator and paid advertising specialist",
  },
  "kaitlin wilcox": {
    badge: "RN",
    credentials: "Acquisitions; RN",
    clinic: "",
    experience: "Registered Nurse and former cardiac rehab exercise physiologist",
  },
  "trampis beatty": {
    badge: "OPS",
    credentials: "Acquisitions; Web Builds",
    clinic: "",
    experience: "Leads website builds and acquisition support",
  },
  "jack licata": {
    badge: "BIZ",
    credentials: "Client Success; Acquisitions Support; PT Biz Coach Tools Creator",
    clinic: "",
    experience: "Supports advisor sales process and helps execute web, AI, and workflow fulfillment",
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
      badge: "PT",
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
    badge: "OPS",
    credentials: "Team profile",
    clinic: "No PT clinic ownership listed",
    experience: member.title || "Internal operations and client success",
  });
}

function sanitizeProfile(profile: MemberProfile) {
  const clinic = profile.clinic
    .replace(/^No PT clinic ownership(?: listed)?\s*$/i, "")
    .trim();
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

function ClinicContext({
  clinic,
  clinicLogoUrl,
}: {
  clinic: string;
  clinicLogoUrl?: string;
}) {
  return (
    <small className="member-row-context member-row-context-with-logo">
      {clinicLogoUrl && (
        <span className="clinic-logo-chip" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clinicLogoUrl} alt="" className="clinic-logo-img" loading="lazy" />
        </span>
      )}
      <span className="member-row-context-text">{clinic}</span>
    </small>
  );
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
  className,
  fallbackClassName,
}: {
  name: string;
  imageUrl?: string | null;
  className: string;
  fallbackClassName: string;
}) {
  const [didError, setDidError] = useState(false);
  const isJack = normalizeText(name) === JACK_NAME;
  const resolvedImageUrl = isJack ? JACK_LOGIN_IMAGE_URL : imageUrl;
  const imageClassName = `${className}${isJack ? " jack-headshot-tight" : ""}`;

  if (resolvedImageUrl && !didError) {
    return (
      <div className={`team-avatar-shell ${className}-shell`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedImageUrl}
          alt={name}
          className={imageClassName}
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

function getBadgeTokens(profile?: { badge: string } | null) {
  if (!profile?.badge) return [];
  return profile.badge
    .split(",")
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
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
  const selectedUserBadgeTokens = useMemo(() => getBadgeTokens(selectedUserProfile), [selectedUserProfile]);

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
                const badgeTokens = getBadgeTokens(profile);

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
                        className="member-list-photo"
                        fallbackClassName="member-list-photo-fallback"
                      />
                      <div className="member-row-meta">
                        <strong>{member.name}</strong>
                        <span>{member.title || "Team Member"}</span>
                        <em>{member.teamSection || "PT Biz Team"}</em>
                        {!!badgeTokens.length && (
                          <div className="member-row-badge-list" aria-label={`${member.name} credentials`}>
                            {badgeTokens.map((badgeToken) => (
                              <small key={`${member.id}-${badgeToken}`} className="member-row-badge-chip">
                                {badgeToken}
                              </small>
                            ))}
                          </div>
                        )}
                        <div className="member-row-detail-grid">
                          <small className="member-row-cred">{profile.credentials}</small>
                          {profile.clinic && (
                            <ClinicContext clinic={profile.clinic} clinicLogoUrl={profile.clinicLogoUrl} />
                          )}
                          {profile.experience && <small className="member-row-context">{profile.experience}</small>}
                        </div>
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
                className="selected-user-photo"
                fallbackClassName="selected-user-photo-fallback"
              />
              <div>
                <h2>{selectedUser.name}</h2>
                <p>{selectedUser.title}</p>
                <span>{selectedUser.teamSection}</span>
                {!!selectedUserBadgeTokens.length && (
                  <div className="selected-user-badge-list" aria-label={`${selectedUser.name} credentials`}>
                    {selectedUserBadgeTokens.map((badgeToken) => (
                      <small key={`${selectedUser.id}-${badgeToken}`} className="selected-user-badge-chip">
                        {badgeToken}
                      </small>
                    ))}
                  </div>
                )}
                {selectedUserProfile && (
                  <>
                    <div className="selected-user-detail-grid">
                      <small className="selected-user-cred">{selectedUserProfile.credentials}</small>
                      {selectedUserProfile.clinic && (
                        <small className="selected-user-context selected-user-context-with-logo">
                          {selectedUserProfile.clinicLogoUrl && (
                            <span className="clinic-logo-chip" aria-hidden="true">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={selectedUserProfile.clinicLogoUrl} alt="" className="clinic-logo-img" loading="lazy" />
                            </span>
                          )}
                          <span className="member-row-context-text">{selectedUserProfile.clinic}</span>
                        </small>
                      )}
                      {selectedUserProfile.experience && (
                        <small className="selected-user-context">{selectedUserProfile.experience}</small>
                      )}
                    </div>
                  </>
                )}
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
