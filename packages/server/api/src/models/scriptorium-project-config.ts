export interface RefTheme {
  primary?: string;
  primaryForeground?: string;
  ring?: string;
  accent?: string;
  accentForeground?: string;
  border?: string;
}

export interface RefMetadata {
  label?: string;
  theme?: RefTheme;
}

export type PublishedVersionIncludeRule =
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

export type ProjectLink =
  | {
      type: "main";
      url: string;
      text: string;
      icon?: string;
      description?: string;
      external?: boolean;
      on?: "menu" | "nav" | "all";
      active?: "url" | "nested-url" | "none";
    }
  | {
      type: "button";
      url: string;
      text: string;
      icon?: string;
      secondary?: boolean;
      external?: boolean;
      on?: "menu" | "nav" | "all";
      active?: "url" | "nested-url" | "none";
    }
  | {
      type: "icon";
      url: string;
      icon: string;
      label: string;
      text?: string;
      secondary?: boolean;
      external?: boolean;
      on?: "menu" | "nav" | "all";
      active?: "url" | "nested-url" | "none";
    };

export interface ScriptoriumProjectConfig {
  name: string;
  description?: string;
  logo: string;
  favicon?: string;
  state?: {
    bundling?: {
      captions?: string[];
    };
  };
  urls?: Record<string, string>;
  links?: ProjectLink[];
  versions: {
    home: string;
    include: PublishedVersionIncludeRule[];
    meta: Record<string, RefMetadata>;
  };
}
