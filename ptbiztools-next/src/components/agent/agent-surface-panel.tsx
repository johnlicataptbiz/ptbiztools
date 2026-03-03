"use client";

import { useMemo, useState } from "react";
import type { AgentProtocolMessage } from "@/lib/agent/protocol";

interface SurfaceState {
  surfaceId: string | null;
  title: string;
  components: Array<{ id: string; kind: "metric" | "timeline" | "alert"; label: string }>;
  data: Record<string, string | number | boolean | null>;
}

const initialSurface: SurfaceState = {
  surfaceId: null,
  title: "",
  components: [],
  data: {},
};

async function consumeNdjson(
  response: Response,
  onMessage: (message: AgentProtocolMessage) => void,
): Promise<number> {
  if (!response.body) return 0;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lines = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) break;
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      try {
        onMessage(JSON.parse(line) as AgentProtocolMessage);
        lines += 1;
      } catch {
        // Ignore malformed line chunks.
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      onMessage(JSON.parse(tail) as AgentProtocolMessage);
      lines += 1;
    } catch {
      // Ignore malformed final chunk.
    }
  }

  return lines;
}

export function AgentSurfacePanel() {
  const [prompt, setPrompt] = useState("Generate an executive PT operations surface with risk and momentum signals.");
  const [runId, setRunId] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<AgentProtocolMessage[]>([]);
  const [surface, setSurface] = useState<SurfaceState>(initialSurface);

  const lifecycle = useMemo(
    () => messages.filter((message) => message.protocol === "ag-ui"),
    [messages],
  );

  const applyProtocolMessage = (message: AgentProtocolMessage) => {
    setMessages((prev) => [...prev, message]);

    if (message.protocol !== "a2ui") return;

    if (message.type === "createSurface") {
      setSurface({ surfaceId: message.surfaceId, title: message.title, components: [], data: {} });
      return;
    }

    if (message.type === "updateComponents") {
      setSurface((prev) => ({ ...prev, surfaceId: message.surfaceId, components: message.components }));
      return;
    }

    if (message.type === "updateDataModel") {
      setSurface((prev) => ({ ...prev, surfaceId: message.surfaceId, data: { ...prev.data, ...message.data } }));
      return;
    }

    if (message.type === "deleteSurface") {
      setSurface(initialSurface);
    }
  };

  const runSurface = async () => {
    setIsRunning(true);
    setMessages([]);
    setSurface(initialSurface);
    setLineCount(0);

    const response = await fetch("/api/agent/surface", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      setIsRunning(false);
      throw new Error(`Surface request failed (${response.status})`);
    }

    const nextRunId = response.headers.get("x-workflow-run-id");
    if (nextRunId) setRunId(nextRunId);

    const consumed = await consumeNdjson(response, applyProtocolMessage);
    setLineCount(consumed);
    setIsRunning(false);
  };

  const resumeStream = async () => {
    if (!runId) return;
    setIsRunning(true);

    const response = await fetch(`/api/agent/surface/${encodeURIComponent(runId)}/stream?startIndex=${lineCount}`);
    if (!response.ok) {
      setIsRunning(false);
      throw new Error(`Resume failed (${response.status})`);
    }

    const consumed = await consumeNdjson(response, applyProtocolMessage);
    setLineCount((prev) => prev + consumed);
    setIsRunning(false);
  };

  return (
    <section className="rounded-(--radius-2xl) border border-border bg-surface/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Agentic Layer (A2UI + AG-UI)</h2>
          <p className="text-sm text-muted-foreground">
            Durable Workflow + AI SDK-driven surface synthesis with resumable stream transport.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resumeStream}
            disabled={!runId || isRunning}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resume Stream
          </button>
          <button
            type="button"
            onClick={() => void runSurface()}
            disabled={isRunning}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? "Running..." : "Generate Surface"}
          </button>
        </div>
      </div>

      <label className="mt-4 block text-xs uppercase tracking-wide text-muted-foreground">
        Agent Prompt
      </label>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">AG-UI Lifecycle</h3>
            <span className="font-mono text-xs text-muted-foreground">{runId || "no-run"}</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {lifecycle.length === 0 && <li className="text-muted-foreground">No lifecycle events yet.</li>}
            {lifecycle.map((event, index) => (
              <li key={`${event.type}-${index}`} className="rounded-lg bg-stone-50 px-3 py-2">
                <div className="font-mono text-xs text-accent">{event.type}</div>
                <div>{event.message}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold">A2UI Surface State</h3>
          <p className="mt-1 text-xs text-muted-foreground">{surface.title || "No active surface"}</p>

          <div className="mt-3 space-y-2 text-sm">
            {surface.components.map((component) => (
              <div key={component.id} className="rounded-lg border border-border/80 px-3 py-2">
                <div className="font-medium">{component.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{component.kind}</div>
              </div>
            ))}
          </div>

          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-stone-950 p-3 text-xs text-stone-100">
{JSON.stringify(surface.data, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}
