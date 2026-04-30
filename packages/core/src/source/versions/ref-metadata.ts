import type { ScriptoriumProjectConfig } from "../../project/project-config";

export function getRefMetadata(config: ScriptoriumProjectConfig, refName: string) {
  const metadata = config.versions.meta[refName];

  return {
    name: refName,
    label: metadata?.label ?? refName,
    theme: metadata?.theme
  };
}
