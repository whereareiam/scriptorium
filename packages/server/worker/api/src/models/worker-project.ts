export type WorkerPublishedVersionIncludeRule =
  | {
      type: "branch";
      name: string;
    }
  | {
      type: "branch";
      pattern: string;
    }
  | {
      type: "tag";
      name: string;
    }
  | {
      type: "tag";
      pattern: string;
    };

export interface WorkerProject {
  homeRefName: string;
  include: WorkerPublishedVersionIncludeRule[];
  extraRefNames: string[];
}
