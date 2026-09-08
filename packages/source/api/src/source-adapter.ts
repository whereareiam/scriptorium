import type { PrepareRequest } from "@scriptorium/server-worker-api";

export type SourceRefKind = "branch" | "tag";

export interface SourceRef {
  name: string;
  fullName: string;
  objectName: string;
  kind: SourceRefKind;
}

export interface StageRepository {
  repoRoot: string;
  listRefs(): Promise<SourceRef[]>;
  listFiles(refName: string, projectRoot: string): Promise<string[]>;
  readFile(refName: string, filePath: string): Promise<Buffer>;
  readFiles?(refName: string, filePaths: string[]): Promise<Map<string, Buffer>>;
  getCurrentBranch?(): Promise<string>;
  isWorktreeDirty?(): Promise<boolean>;
}

export interface SourceAdapterCallbacks {
  requestPrepare: (request?: PrepareRequest) => Promise<void>;
}

export interface SourceAdapter {
  readonly type: "git" | "local";
  prepareRepository(): Promise<{
    projectRoot: string;
    repository: StageRepository;
  }>;
  startBackgroundServices?: (callbacks: SourceAdapterCallbacks) => { close(): void } | null;
}
