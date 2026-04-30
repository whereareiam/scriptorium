import type { SourceRefKind } from "@scriptorium/core";

export interface BundledVersion {
  name: string;
  kind: SourceRefKind;
  fullName: string;
  objectName: string;
  contentDir: string;
  assetsDir: string;
  configPath: string;
}
