import { start } from "workflow/api";
import { runAgentSurfaceWorkflow } from "@/workflows/agent-surface";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt?.trim() || "Create a performance operations dashboard for PT coaching.";

  const run = await start(runAgentSurfaceWorkflow, [{ prompt }]);

  return new Response(run.readable, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-workflow-run-id": run.runId,
    },
  });
}
