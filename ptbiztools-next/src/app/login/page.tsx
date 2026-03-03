"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { LOGIN_LOGO_URL } from "@/constants/branding";
import { useSession } from "@/lib/auth/session-context";
import { getTeamMembers, setupPassword, type TeamMember } from "@/lib/ptbiz-api";

const REMEMBERED_USER_KEY = "ptbiz_selected_user_id";
const JACK_NAME = "jack licata";

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isBoardMember(member: TeamMember) {
  const section = normalizeText(member.teamSection);
  const title = normalizeText(member.title);
  return section.includes("board") || title.includes("board");
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamAvatar({ member }: { member: TeamMember }) {
  const [didError, setDidError] = useState(false);

  if (member.imageUrl && !didError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.imageUrl}
        alt={member.name}
        className="h-10 w-10 rounded-full object-cover"
        onError={() => setDidError(true)}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
      {getInitials(member.name)}
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

  const handleBack = () => {
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
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <div className="rounded-(--radius-xl) border border-border bg-surface px-6 py-5 text-sm text-muted-foreground">
          Loading team members...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <section className="rounded-(--radius-2xl) border border-border bg-surface p-6 shadow-sm md:p-8">
        <header className="border-b border-border pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGIN_LOGO_URL}
            alt="PT Biz Coach"
            className="h-8 w-auto max-w-[220px]"
          />
          <p className="mt-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">PT Biz Coach</p>
          <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose your profile and use your account password.</p>
        </header>

        {!selectedUser && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Choose your profile</h2>
              <p className="text-xs text-muted-foreground">{orderedTeamMembers.length} team members</p>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {orderedTeamMembers.map((member) => (
                <button
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 text-left hover:border-accent"
                  onClick={() => handleUserSelect(member.id)}
                >
                  <TeamAvatar member={member} />
                  <div>
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.title || "Team Member"}</p>
                    <p className="text-xs text-muted-foreground/80">{member.teamSection || "PT Biz Team"}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedUser && (
          <section className="mt-6 space-y-5">
            <button className="text-sm text-accent hover:underline" onClick={handleBack}>
              Choose a different person
            </button>

            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <TeamAvatar member={selectedUser} />
                <div>
                  <p className="text-sm font-semibold">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.title || "Team Member"}</p>
                </div>
              </div>
            </div>

            {needsFirstTimeSetup && (
              <form className="space-y-3 rounded-xl border border-border bg-white p-4" onSubmit={handleSetupPassword}>
                <h3 className="text-sm font-semibold">Create your password</h3>
                <label className="block text-xs text-muted-foreground">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Confirm password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(event) => setIdentityConfirmed(event.target.checked)}
                  />
                  I confirm this is my profile
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Save password
                </button>
              </form>
            )}

            <form className="space-y-3 rounded-xl border border-border bg-white p-4" onSubmit={handleLogin}>
              <h3 className="text-sm font-semibold">Sign in</h3>
              <label className="block text-xs text-muted-foreground">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Keep me signed in
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Sign in
              </button>
            </form>
          </section>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">{message}</p>
        )}
      </section>
    </main>
  );
}
