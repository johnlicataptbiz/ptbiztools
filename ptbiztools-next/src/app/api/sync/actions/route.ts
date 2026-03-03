import { NextResponse } from "next/server";
import type { LocalAction } from "@/lib/local-first/types";

interface BackendActionLog {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
  user?: {
    name?: string;
    imageUrl?: string | null;
  } | null;
}

function toLocalAction(log: BackendActionLog): LocalAction {
  return {
    id: log.id,
    actionType: log.actionType,
    description: log.description,
    createdAt: log.createdAt,
    userName: log.user?.name ?? null,
    userImageUrl: log.user?.imageUrl ?? null,
    source: "remote",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || "75");
  const backendBase = (process.env.PTBIZ_BACKEND_URL || "http://localhost:3000/api").replace(/\/$/, "");

  try {
    const upstream = await fetch(`${backendBase}/actions?limit=${Math.max(1, Math.min(limit, 200))}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }

    const payload = (await upstream.json()) as { logs?: BackendActionLog[] };
    const logs = (payload.logs || []).map(toLocalAction);

    return NextResponse.json({
      source: "backend",
      syncedAt: new Date().toISOString(),
      logs,
    });
  } catch {
    const now = new Date();
    const fallback: LocalAction[] = [
      {
        id: `fallback-${now.getTime()}`,
        actionType: "sync_fallback",
        description: "Backend unavailable. Running local-first mode only.",
        createdAt: now.toISOString(),
        userName: "System",
        userImageUrl: null,
        source: "remote",
      },
    ];

    return NextResponse.json({
      source: "fallback",
      syncedAt: now.toISOString(),
      logs: fallback,
    });
  }
}
