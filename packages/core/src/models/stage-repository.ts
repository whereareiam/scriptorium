import type { SourceRef } from "./source-ref";

export interface StageRepository {
  repoRoot: string;
  listRefs(): Promise<SourceRef[]>;
  listFiles(refName: string, projectRoot: string): Promise<string[]>;
  readFile(refName: string, filePath: string): Promise<Buffer>;
  getCurrentBranch?(): Promise<string>;
  isWorktreeDirty?(): Promise<boolean>;
}
