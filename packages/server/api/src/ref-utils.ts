import type { ScriptoriumProjectConfig } from "./models/scriptorium-project-config";

export function toRefSlug(refName: string) {
  return refName.replace(/[^A-Za-z0-9._-]+/g, "~");
}

export function getRefMetadata(config: ScriptoriumProjectConfig, refName: string) {
  const metadata = config.versions.meta[refName];

  return {
    name: refName,
    label: metadata?.label ?? refName,
    theme: metadata?.theme
  };
}
