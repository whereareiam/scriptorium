import type { PrepareRequest } from "@scriptorium/server-worker-api";
import { getRuntimeMemorySnapshot } from "./runtime-memory-snapshot";

export interface BundlingLogContext {
  run_id?: string;
  trigger_reason?: PrepareRequest["reason"];
  source_type: "git" | "local";
}

export interface BundlingLogPayload extends BundlingLogContext {
  duration_ms?: number;
  phase?: string;
  ref_name?: string;
  event_name?: string;
  page_count?: number;
  ref_count?: number;
  search_document_count?: number;
  artifact_bytes?: number;
  phase_durations_ms?: Record<string, number>;
  active_generation_id?: string;
  rerun_queued?: boolean;
  error?: string;
}

export class BundlingLogger {
  constructor(private readonly sourceType: "git" | "local") {}

  emit(event: string, payload: Omit<BundlingLogPayload, "source_type"> = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      source_type: this.sourceType,
      ...payload,
      ...getRuntimeMemorySnapshot()
    }));
  }
}
