export type SourceRefKind = "branch" | "tag";

export interface SourceRef {
  name: string;
  fullName: string;
  objectName: string;
  kind: SourceRefKind;
}
