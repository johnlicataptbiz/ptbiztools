"use client";

import "@/styles/login-credential-badges.css";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Dumbbell,
  Heart,
  LockKeyhole, 
  Search,
  ShieldCheck, 
  Star, 
  Stethoscope,
  UserRound, 
  Users,
  Eye, 
  EyeOff,
  Briefcase,
  GraduationCap,
  AlertCircle,
  RotateCcw,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { CorexButton, CorexInput } from "@/components/corex/CorexComponents";
import { useSession } from "@/lib/auth/session-context";
import { getTeamMembers, setupPassword, type TeamMember } from "@/lib/ptbiz-api";
import { LOGIN_LOGO_URL } from "@/constants/branding";
import { CMS_ASSETS, getCmsAsset } from "@/constants/cms-assets";
import { HeroImage } from "@/components/ui/OptimizedImage";

const REMEMBERED_USER_KEY = "ptbiz_selected_user_id";
const JACK_NAME = "jack licata";
const JACK_LOGIN_IMAGE_URL = "https://ca.slack-edge.com/TJ3QQ76KV-U09E8E2JU7N-a11935a3ac5d-512";

// Dev mode bypass
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_PASSWORD = "dev123";

const DEPARTMENTS = ["All", "Coaches", "Partners", "Client Success", "Advisors", "Acquisitions", "Internal"] as const;

// Department icons for visual recognition
const DEPARTMENT_ICONS: Record<string, React.ReactNode> = {
  "All": <Users size={14} />,
  "Coaches": <Dumbbell size={14} />,
  "Partners": <Briefcase size={14} />,
  "Client Success": <Heart size={14} />,
  "Advisors": <GraduationCap size={14} />,
  "Acquisitions": <Stethoscope size={14} />,
  "Internal": <Star size={14} />,
};

type MemberProfile = {
  badge: string;
  credentials: string;
  clinic: string;
  experience: string;
  clinicLogoUrl?: string;
};

const MEMBER_PROFILES_BY_NAME: Record<string, MemberProfile> = {
  // Coaches (12)
  "ashley speights": {
    badge: "PT, DPT, PES",
    credentials: "Coach; PT, DPT, PES",
    clinic: "Founder & Owner - The PHYT Collective (Washington, DC)",
    experience: "Athlete-focused cash practice with strong community education",
    clinicLogoUrl: "https://logos.hunter.io/phytcollective.com",
  },
  "brooke miller": {
    badge: "PT, DPT, OCS",
    credentials: "Coach; PT, DPT, OCS",
    clinic: "Owner - PeakRx Therapy / PeakRx PT & Wellness (Dallas/Lewisville, TX)",
    experience: "Pelvic health + orthopedic performance specialist clinic owner",
    clinicLogoUrl: "https://logos.hunter.io/peakrxtherapy.com",
  },
  "chris robl": {
    badge: "DPT",
    credentials: "Coach; DPT",
    clinic: "Founder/Owner - Physio Room (Colorado; hybrid model)",
    experience: "10+ years clinical practice; built multi-location hybrid business",
    clinicLogoUrl: "https://logos.hunter.io/physioroomco.com",
  },
  "colleen davis": {
    badge: "DPT",
    credentials: "Coach; DPT",
    clinic: "Founder & Owner - GOAT Physical Therapy and Wellness (Gales Ferry, CT)",
    experience: "Scaled to a 3,500 sq ft clinic with four therapists",
    clinicLogoUrl: "https://logos.hunter.io/goatpt.com",
  },
  "courtney morse": {
    badge: "DPT",
    credentials: "Head Coach; DPT",
    clinic: "Owner/Founder - Natural Wellness Physiotherapy (Wichita, KS)",
    experience: "Built team-run cash clinic and now focuses on systems + leadership",
    clinicLogoUrl: "https://logos.hunter.io/teamnaturalwellness.com",
  },
  "daniel laughlin": {
    badge: "PT, DPT",
    credentials: "Coach; PT, DPT",
    clinic: "Owner - Laughlin Performance & Physical Therapy (Overland Park, KS; hybrid model)",
    experience: "Converted from insurance model to high-performing hybrid practice",
    clinicLogoUrl: "https://logos.hunter.io/lpptkc.com",
  },
  "dj haskins": {
    badge: "PT, DPT",
    credentials: "Coach; PT, DPT",
    clinic: "Founder - Bliss Pelvic Health (Tampa Bay/Wesley Chapel, FL)",
    experience: "Pelvic health practice helping women return to confident movement",
    clinicLogoUrl: "https://logos.hunter.io/blisspelvichealth.com",
  },
  "elizabeth rudd": {
    badge: "PT, DPT, OCS, CSCS",
    credentials: "Coach; PT, DPT, OCS, CSCS",
    clinic: "Founder/Owner - Well Equipt Physical Therapy (Atlanta, GA; founded 2018)",
    experience: "Sports performance, rehab, and pain-management specialist",
    clinicLogoUrl: "https://logos.hunter.io/wellequiptpt.com",
  },
  "jaxie meth": {
    badge: "PT, DPT",
    credentials: "Coach; PT, DPT",
    clinic: "Founder/Owner - The METHOD Performance and Physical Therapy (Boston, MA area)",
    experience: "Pelvic floor specialist for fitness athletes",
    clinicLogoUrl: "https://logos.hunter.io/themethodpt.com",
  },
  "michael sclafani": {
    badge: "DPT, SCS, CSCS",
    credentials: "Coach; DPT, SCS, CSCS",
    clinic: "Founder/Owner - Tideline Sports Performance & Rehabilitation (Sarasota/Bradenton, FL area)",
    experience: "Sports residency trained; published IJSPT author; DPT faculty contributor",
    clinicLogoUrl: "https://logos.hunter.io/tidelinesportsperformance.com",
  },
  "tyler humphries": {
    badge: "DPT",
    credentials: "Coach; DPT",
    clinic: "Founder/Owner - Bulletproof Physical Therapy (Houston, TX)",
    experience: "Performance-based rehab model for active adults and athletes",
    clinicLogoUrl: "https://logos.hunter.io/bulletproofpt.com",
  },
  "ziad dahdul": {
    badge: "DPT, OCS",
    credentials: "Coach; DPT, OCS",
    clinic: "Founder/Owner - Ignite Phyzio & Sports Performance (Orange County/La Habra, CA)",
    experience: "11+ years with athletes; USC DPT; functional performance focus",
    clinicLogoUrl: "https://logos.hunter.io/ignitephyzio.com",
  },

  // Partners (3)
  "yves gege": {
    badge: "MSPT",
    credentials: "Partner; Head of Customer Success & Coaching; MSPT",
    clinic: "Founder - Made 2 Move Physical Therapy (Charleston, SC area)",
    experience: "Grew to multiple locations/providers; sold in 2020; remains mentor",
    clinicLogoUrl: "https://logos.hunter.io/made2movept.com",
  },
  "danny matta": {
    badge: "DPT, OCS, CSCS",
    credentials: "Partner; CEO; DPT, OCS, CSCS",
    clinic: "Co-founder/Co-owner (with Ashley Matta) - Athletes' Potential (Decatur/Atlanta, GA)",
    experience: "Former U.S. Army Physical Therapist; co-founded PT Biz and scaled Athletes' Potential before selling in 2023",
  },
  "jerred moon": {
    badge: "BIZ",
    credentials: "Partner; CFO",
    clinic: "",
    experience: "PT Biz CFO + acquisitions leader; USAF veteran; 8-figure digital operator; author of Killing Comfort",
  },

  // Client Success (5)
  "amy gege": {
    badge: "OPS",
    credentials: "Client Success; Events & Operations",
    clinic: "",
    experience: "20+ years event operations; coordinates PT Biz live experiences",
  },
  "ashley matta": {
    badge: "OWNER",
    credentials: "Client Success; First Lady of PT Biz",
    clinic: "Co-owner (with Danny Matta) - Athletes' Potential",
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
  "jack licata": {
    badge: "BIZ",
    credentials: "Client Success; Acquisitions Support; PT Biz Coach Tools Creator",
    clinic: "",
    experience: "Supports advisor sales process and helps execute web, AI, and workflow fulfillment",
  },

  // Advisors (2)
  "john licata": {
    badge: "BIZ",
    credentials: "Advisor; Senior Advisor",
    clinic: "Senior Advisor - PT Biz",
    experience: "30+ years in consumer goods leadership, sales strategy, and executive consulting",
  },
  "toni counts": {
    badge: "PT, DPT",
    credentials: "Advisor; Business Advisor; PT, DPT",
    clinic: "Founder/Owner - Off The Block Performance Physical Therapy (Central/Easley, SC area)",
    experience: "Multiple locations with husband Cole",
    clinicLogoUrl: "https://logos.hunter.io/offtheblockpt.com",
  },

  // Acquisitions (5)
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

  // Internal (1)
  "pd": {
    badge: "OPS",
    credentials: "Internal; PTBiz Dev Tester",
    clinic: "",
    experience: "Development and testing operations",
  },
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getMemberDepartment(member: TeamMember): string {
  const section = normalizeText(member.teamSection);
  if (section.includes("coach")) return "Coaches";
  if (section.includes("partner")) return "Partners";
  if (section.includes("advisor")) return "Advisors";
  if (section.includes("acquisition")) return "Acquisitions";
  if (section.includes("client success")) return "Client Success";
  return "Internal";
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

// Individual credential badge themes
function getCredentialStyle(cred: string): string {
  const c = cred.trim().toUpperCase();
  if (['DPT'].includes(c)) return 'credential-dpt';
  if (['PT', 'MSPT'].includes(c)) return 'credential-pt';
  if (['OCS', 'SCS'].includes(c)) return 'credential-ocs';
  if (['CSCS'].includes(c)) return 'credential-cscs';
  if (['PES'].includes(c)) return 'credential-pes';
  if (['RN'].includes(c)) return 'credential-rn';
  if (['BIZ', 'OWNER', 'OPS'].includes(c)) return 'credential-ops';
  return 'credential-default';
}

// Get unique first letters for alphabet index
function getAlphabetIndex(members: TeamMember[]): string[] {
  const letters = new Set<string>();
  members.forEach(member => {
    const firstChar = member.name.charAt(0).toUpperCase();
    if (firstChar.match(/[A-Z]/)) {
      letters.add(firstChar);
    }
  });
  return Array.from(letters).sort();
}

// Get recent users from localStorage
function getRecentUsers(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("ptbiz_recent_users");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save recent user
function saveRecentUser(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentUsers();
    const updated = [userId, ...recent.filter(id => id !== userId)].slice(0, 5);
    localStorage.setItem("ptbiz_recent_users", JSON.stringify(updated));
  } catch {
    // Ignore errors
  }
}

function ProfileSkeleton() {
  return (
    <div className="profile-card skeleton">
      <div className="skeleton-avatar" />
      <div className="skeleton-info">
        <div className="skeleton-line skeleton-name" />
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-badges">
          <div className="skeleton-badge" />
          <div className="skeleton-badge" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="login-error-state">
      <div className="error-icon">
        <AlertCircle size={48} />
      </div>
      <h3>Unable to load team members</h3>
      <p>{error?.message || "Something went wrong while loading the team directory."}</p>
      <button onClick={onRetry} className="error-retry-btn">
        <RotateCcw size={16} />
        Try Again
      </button>
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<typeof DEPARTMENTS[number]>("All");

  // Active letter for alphabet index
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Search input ref for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: / to focus search, Esc to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          // Clear search when Esc is pressed in search input
          if (e.target === searchInputRef.current) {
            setSearchTerm("");
            (e.target as HTMLInputElement).blur();
          }
        }
        return;
      }

      // / to focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Alphabet index
  const alphabetIndex = useMemo(() => getAlphabetIndex(orderedTeamMembers), [orderedTeamMembers]);
  
  // Department counts
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { All: visibleMembers.length };
    visibleMembers.forEach(m => {
      const dept = getMemberDepartment(m);
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [visibleMembers]);

  // Filtered members based on search and department
  const filteredMembers = useMemo(() => {
    let members = visibleMembers;
    
    if (selectedDepartment !== "All") {
      members = members.filter(m => getMemberDepartment(m) === selectedDepartment);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      members = members.filter(m => 
        m.name.toLowerCase().includes(term) ||
        (m.title || "").toLowerCase().includes(term)
      );
    }
    
    return members.sort((a, b) => {
      const priorityDiff = getMemberSortPriority(a) - getMemberSortPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [visibleMembers, selectedDepartment, searchTerm]);

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

  // Handle alphabet letter click
  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    // Find first member with this letter and scroll to it
    const element = document.getElementById(`member-${letter.toLowerCase()}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Reset after delay
    setTimeout(() => setActiveLetter(null), 1000);
  };

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

    // Dev mode bypass - accept dev123 password
    if (DEV_MODE && password === DEV_PASSWORD) {
      // For dev mode, we'll simulate a successful login by setting the user ID in localStorage
      // and redirecting to dashboard. The actual auth will be handled by the session context.
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
    
    // Show success animation
    setShowSuccess(true);
    setSubmitting(false);
    
    // Redirect after animation
    setTimeout(() => {
      router.replace("/dashboard");
    }, 1500);
  };

  if (sessionLoading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-loading">
            <div className="login-spinner" />
            <p>Checking session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (teamQuery.isLoading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <header className="login-header">
            <div className="login-logo-hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="login-logo-image" src={LOGIN_LOGO_URL} alt="PTBizCoach" />
            </div>
            <h1>Welcome Back</h1>
            <p>Loading team directory...</p>
          </header>
          <section className="member-picker">
            <div className="profile-grid">
              {[...Array(6)].map((_, i) => (
                <ProfileSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (teamQuery.error) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <ErrorState 
            error={teamQuery.error as Error} 
            onRetry={() => teamQuery.refetch()} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      {/* Hero Background with CMS Asset */}
      <div className="login-hero-background">
        <HeroImage
          asset={CMS_ASSETS.brand.heroPrimary}
          height="100%"
          overlayOpacity={0.7}
        />
      </div>

      {/* Logo Hero Section - NEW: Prominent brand logo */}
      {!selectedUser && (
        <div className="login-logo-hero-section">
          <div className="login-logo-glow" />
          <div className="login-logo-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              className="login-logo-image-hero" 
              src={LOGIN_LOGO_URL} 
              alt="PT Biz Tools" 
            />
          </div>
          <p className="login-brand-tagline">Professional tools for PT business growth</p>
        </div>
      )}

      {/* Alphabet Index - Quick Scan Aid */}
      {alphabetIndex.length > 0 && !selectedUser && (
        <div className="alphabet-index" role="navigation" aria-label="Alphabetical index">
          {alphabetIndex.map(letter => (
            <button
              key={letter}
              className={`alphabet-letter ${activeLetter === letter ? 'active' : ''}`}
              onClick={() => handleLetterClick(letter)}
              aria-label={`Jump to ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <header className="login-header" style={{ padding: "24px 24px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", margin: "0 0 8px 0", fontWeight: 700 }}>Welcome Back</h1>
          <p style={{ fontSize: "14px", margin: 0, opacity: 0.7 }}>Select your profile to sign in</p>
        </header>

        {!selectedUser && (
          <section className="member-picker">
            {/* Search Bar */}
            <div className="search-container">
              <div className="search-icon">
                <Search size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name or title... (Press / to focus)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                aria-label="Search team members"
              />
              {searchTerm && (
                <button 
                  className="search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="search-shortcut">/</kbd>
            </div>

            {/* Department Tabs */}
            <div className="department-tabs">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`department-tab ${selectedDepartment === dept ? 'active' : ''}`}
                  aria-pressed={selectedDepartment === dept}
                >
                  {DEPARTMENT_ICONS[dept]}
                  <span>{dept}</span>
                  <span className="department-count">{departmentCounts[dept] || 0}</span>
                </button>
              ))}
            </div>

            {/* Profile Grid */}
            <div className="profile-grid">
              {filteredMembers && filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const profile = getMemberProfile(member);
                  const badgeTokens = getBadgeTokens(profile);
                  const isJack = normalizeText(member.name) === JACK_NAME;
                  const imageUrl = isJack ? JACK_LOGIN_IMAGE_URL : member.imageUrl;

                  return (
                    <motion.button
                      key={member.id}
                      className="profile-card"
                      onClick={() => handleUserSelect(member.id)}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="profile-card-avatar">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={member.name}
                            className={`profile-avatar-img ${isJack ? 'jack-headshot' : ''}`}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="profile-avatar-fallback">
                            {getInitials(member.name)}
                          </div>
                        )}
                      </div>
                      <div className="profile-card-info">
                        <div className="profile-name">{member.name}</div>
                        <div className="profile-title">{member.title || "Team Member"}</div>
                        
                        {/* Individual themed credential badges */}
                        {badgeTokens.length > 0 && (
                          <div className="profile-credential-badges">
                            {badgeTokens.map((cred, index) => (
                              <span 
                                key={`${member.id}-${cred}-${index}`} 
                                className={`profile-credential-badge ${getCredentialStyle(cred)}`}
                                title={cred}
                              >
                                {cred}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="profile-department">{getMemberDepartment(member)}</div>
                      </div>
                      <div className="profile-card-action">Select</div>
                    </motion.button>
                  );
                })
              ) : (
                <div className="no-results">
                  <p>No profiles found matching your search.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Password Entry Flow */}
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
              <div>
                <h2>{selectedUser.name}</h2>
                <p>{selectedUser.title}</p>
                <span>{selectedUser.teamSection}</span>
                {selectedUserBadgeTokens.length > 0 && (
                  <div className="selected-user-badge-list">
                    {selectedUserBadgeTokens.map((badgeToken) => (
                      <small key={`${selectedUser.id}-${badgeToken}`} className="selected-user-badge-chip">
                        {badgeToken}
                      </small>
                    ))}
                  </div>
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
                  <span>Encrypted & secure team access</span>
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
                  <span>Encrypted & secure team access</span>
                </div>

                <div className="auth-links">
                  <a href="#" className="auth-link">Forgot password?</a>
                  <a href="#" className="auth-link">Need help?</a>
                </div>

                {/* Reset login data for development */}
                {DEV_MODE && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #666' }}>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem(REMEMBERED_USER_KEY);
                        localStorage.removeItem('ptbiz_recent_users');
                        window.location.reload();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff6b6b',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
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

        {/* Success Animation */}
        {showSuccess && selectedUser && (
          <motion.div
            className="login-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="success-checkmark">
              <CheckCircle2 size={32} />
            </div>
            <p>Welcome back, {selectedUser.name.split(' ')[0]}!</p>
          </motion.div>
        )}

        {message && !showSuccess && (
          <div className={message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('invalid') ? "auth-error" : "login-message"}>
            <UserRound size={14} />
            <span>{message}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
