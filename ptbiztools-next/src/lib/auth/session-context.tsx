"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { getMe, login as loginRequest, logout as logoutRequest, type User } from "@/lib/ptbiz-api";

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (args: { userId: string; password: string; rememberMe: boolean }) => Promise<{ user?: User; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ userId, password, rememberMe }: { userId: string; password: string; rememberMe: boolean }) =>
      loginRequest(userId, password, rememberMe),
    onSuccess: (result) => {
      if (result.user) {
        queryClient.setQueryData(["auth", "me"], { user: result.user });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      queryClient.setQueryData(["auth", "me"], { error: "Not authenticated" });
      queryClient.removeQueries({ queryKey: ["home"] });
    },
  });

  const user = meQuery.data?.user ?? null;
  const value: SessionContextValue = {
    user,
    isLoading: meQuery.isLoading || loginMutation.isPending,
    isAuthenticated: Boolean(user),
    login: async ({ userId, password, rememberMe }) => loginMutation.mutateAsync({ userId, password, rememberMe }),
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
