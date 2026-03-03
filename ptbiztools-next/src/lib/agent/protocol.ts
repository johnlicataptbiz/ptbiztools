export interface A2UICreateSurface {
  protocol: "a2ui";
  type: "createSurface";
  surfaceId: string;
  title: string;
}

export interface A2UIUpdateComponents {
  protocol: "a2ui";
  type: "updateComponents";
  surfaceId: string;
  components: Array<{ id: string; kind: "metric" | "timeline" | "alert"; label: string }>;
}

export interface A2UIUpdateDataModel {
  protocol: "a2ui";
  type: "updateDataModel";
  surfaceId: string;
  data: Record<string, string | number | boolean | null>;
}

export interface A2UIDeleteSurface {
  protocol: "a2ui";
  type: "deleteSurface";
  surfaceId: string;
}

export interface AGUIEvent {
  protocol: "ag-ui";
  type: "agent.started" | "agent.progress" | "agent.completed" | "agent.failed";
  runLabel: string;
  message: string;
  at: string;
}

export type AgentProtocolMessage =
  | A2UICreateSurface
  | A2UIUpdateComponents
  | A2UIUpdateDataModel
  | A2UIDeleteSurface
  | AGUIEvent;

export function encodeProtocolLine(message: AgentProtocolMessage): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(message)}\n`);
}
