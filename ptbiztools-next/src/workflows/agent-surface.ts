import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { getWritable } from "workflow";
import { z } from "zod";
import { encodeProtocolLine, type AgentProtocolMessage } from "@/lib/agent/protocol";

const SurfaceBlueprintSchema = z.object({
  title: z.string().min(3).max(80),
  intent: z.string().min(8).max(300),
  components: z
    .array(
      z.object({
        id: z.string().min(2).max(32),
        kind: z.enum(["metric", "timeline", "alert"]),
        label: z.string().min(2).max(80),
      }),
    )
    .min(2)
    .max(6),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

type SurfaceBlueprint = z.infer<typeof SurfaceBlueprintSchema>;

async function emitMessage(message: AgentProtocolMessage): Promise<void> {
  "use step";

  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  await writer.write(encodeProtocolLine(message));
  writer.releaseLock();
}

async function synthesizeBlueprint(prompt: string): Promise<SurfaceBlueprint> {
  "use step";

  const fallback: SurfaceBlueprint = {
    title: "PT Biz Live Surface",
    intent: "Fallback blueprint generated without external model access.",
    components: [
      { id: "metric-velocity", kind: "metric", label: "Velocity" },
      { id: "timeline-events", kind: "timeline", label: "Recent Events" },
      { id: "alert-risk", kind: "alert", label: "Risk Watch" },
    ],
    data: {
      velocity: 74,
      trend: "+12%",
      risk: "moderate",
      note: prompt.slice(0, 80),
    },
  };

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const result = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: SurfaceBlueprintSchema,
      prompt: [
        "Create a compact dashboard surface blueprint for a PT coaching platform.",
        "Keep outputs concise, practical, and operational.",
        `User intent: ${prompt}`,
      ].join("\n"),
    });

    return result.object;
  } catch {
    return fallback;
  }
}

export async function runAgentSurfaceWorkflow(input: { prompt: string }) {
  "use workflow";

  const runLabel = `surface-${Date.now().toString(36)}`;
  const surfaceId = `a2ui-${Date.now().toString(36)}`;

  await emitMessage({
    protocol: "ag-ui",
    type: "agent.started",
    runLabel,
    message: "Workflow started",
    at: new Date().toISOString(),
  });

  const blueprint = await synthesizeBlueprint(input.prompt);

  await emitMessage({
    protocol: "a2ui",
    type: "createSurface",
    surfaceId,
    title: blueprint.title,
  });

  await emitMessage({
    protocol: "a2ui",
    type: "updateComponents",
    surfaceId,
    components: blueprint.components,
  });

  await emitMessage({
    protocol: "ag-ui",
    type: "agent.progress",
    runLabel,
    message: "Blueprint generated and component tree emitted",
    at: new Date().toISOString(),
  });

  await emitMessage({
    protocol: "a2ui",
    type: "updateDataModel",
    surfaceId,
    data: {
      ...blueprint.data,
      intent: blueprint.intent,
    },
  });

  await emitMessage({
    protocol: "ag-ui",
    type: "agent.completed",
    runLabel,
    message: "Surface ready",
    at: new Date().toISOString(),
  });

  return {
    surfaceId,
    runLabel,
    blueprint,
  };
}
