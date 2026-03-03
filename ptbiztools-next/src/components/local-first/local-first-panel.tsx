"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addLocalAction, readLocalActions, upsertLocalActions } from "@/lib/local-first/db";
import type { LocalAction } from "@/lib/local-first/types";

interface SyncPayload {
  source: string;
  syncedAt: string;
  logs: LocalAction[];
}

export function LocalFirstPanel() {
  const queryClient = useQueryClient();

  const actionsQuery = useQuery({
    queryKey: ["local-actions"],
    queryFn: () => readLocalActions(40),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync/actions?limit=80", { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(`Sync failed (${response.status})`);
      const payload = (await response.json()) as SyncPayload;
      await upsertLocalActions(payload.logs || []);
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["local-actions"] });
    },
  });

  const addDemoAction = async () => {
    await addLocalAction({
      id: `local-${crypto.randomUUID()}`,
      actionType: "local_note_created",
      description: "Created locally before network sync.",
      createdAt: new Date().toISOString(),
      userName: "Local Coach",
      userImageUrl: null,
    });

    void queryClient.invalidateQueries({ queryKey: ["local-actions"] });
  };

  const actions = actionsQuery.data || [];

  return (
    <section className="rounded-(--radius-2xl) border border-border bg-surface/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Local-First Sync Layer</h2>
          <p className="text-sm text-muted-foreground">
            Backed by PGlite (IndexedDB) with pull-sync from backend actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addDemoAction}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-stone-50"
          >
            Add Local Event
          </button>
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncMutation.isPending ? "Syncing..." : "Sync Remote"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Rows: {actions.length}</span>
        <span>Source: {syncMutation.data?.source || "local-only"}</span>
        <span>Last sync: {syncMutation.data?.syncedAt ? new Date(syncMutation.data.syncedAt).toLocaleTimeString() : "never"}</span>
      </div>

      <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-stone-50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.id} className="border-t border-border/70">
                <td className="px-3 py-2 font-mono text-xs">{action.actionType}</td>
                <td className="px-3 py-2">{action.description}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs">{action.source}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(action.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
