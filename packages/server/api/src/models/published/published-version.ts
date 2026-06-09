import type { PublishedVersionKind } from "./published-version-kind";

export interface PublishedVersion {
  name: string;
  kind: PublishedVersionKind;
}
