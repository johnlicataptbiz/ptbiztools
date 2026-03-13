import type { NormalizedGraderResult } from "./graderV2Helpers";

export interface DannyComponentProps {
  className?: string;
}

export interface HistoryEntry {
  id: number;
  date: string;
  closer: string;
  outcome: string;
  program: string;
  prospectName: string;
  result: NormalizedGraderResult;
}
