import type { ScriptoriumProjectConfig, StageRepository } from "@scriptorium/core";

export interface SourceRuntimeAdapterCallbacks {
  requestPrepare: () => Promise<void>;
}

export interface SourceRuntimeAdapter {
  readonly type: "git" | "local";
  shouldHydratePreparedContent: () => boolean;
  prepareRepository: () => Promise<{
    projectRoot: string;
    repository: StageRepository;
  }>;
  loadProjectConfigForWarmup: () => Promise<ScriptoriumProjectConfig | null>;
  startBackgroundServices?: (callbacks: SourceRuntimeAdapterCallbacks) => { close(): void } | null;
  handleWebhook?: (request: Request, callbacks: SourceRuntimeAdapterCallbacks) => Promise<Response>;
}
