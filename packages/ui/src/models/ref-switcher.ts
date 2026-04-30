export interface RefOption {
  name: string;
  kind: "branch" | "tag";
  label?: string;
}

export interface RefSwitcherProps {
  activeRef: string;
  refs: RefOption[];
}
