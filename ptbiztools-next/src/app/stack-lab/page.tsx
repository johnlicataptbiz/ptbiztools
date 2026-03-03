import { notFound } from "next/navigation";
import { AgentSurfacePanel } from "@/components/agent/agent-surface-panel";
import { LocalFirstPanel } from "@/components/local-first/local-first-panel";

export default function StackLabPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_STACK_LAB !== "true") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <header className="rounded-(--radius-2xl) border border-border bg-surface/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PT Biz Tools</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">Core 2026 Migration Shell</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
          Next.js 16 + Turbopack foundation, Tailwind v4 tokenized styling, local-first sync via PGlite,
          and a durable workflow-powered agent stream using A2UI/AG-UI message contracts.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">Framework</p>
            <p className="text-sm font-semibold">Next.js 16 + App Router</p>
          </div>
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">Build Engine</p>
            <p className="text-sm font-semibold">Turbopack (dev)</p>
          </div>
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">Local-First</p>
            <p className="text-sm font-semibold">PGlite + Sync API</p>
          </div>
          <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">Agent Protocol</p>
            <p className="text-sm font-semibold">A2UI + AG-UI Stream</p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6">
        <LocalFirstPanel />
        <AgentSurfacePanel />
      </div>
    </main>
  );
}
