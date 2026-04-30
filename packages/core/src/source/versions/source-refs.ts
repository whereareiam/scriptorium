import semver from "semver";
import type { ScriptoriumProjectConfig } from "../../project/project-config";
import type { SourceRef } from "../../models/source-ref";

function compareTagNames(left: string, right: string) {
  const leftNormalized = semver.valid(left) ?? semver.valid(left.replace(/^v/, ""));
  const rightNormalized = semver.valid(right) ?? semver.valid(right.replace(/^v/, ""));

  if (leftNormalized && rightNormalized) {
    return semver.compare(leftNormalized, rightNormalized);
  }

  return left.localeCompare(right);
}

export function filterPublishedRefs(refs: SourceRef[], config: ScriptoriumProjectConfig) {
  const selected = new Map<string, SourceRef>();
  const homeRef = refs.find((ref) => ref.name === config.versions.home);
  if (!homeRef) {
    throw new Error(`Unable to resolve home version "${config.versions.home}".`);
  }

  selected.set(homeRef.name, homeRef);

  for (const rule of config.versions.include) {
    if ("name" in rule) {
      const ref = refs.find((candidate) => candidate.kind === rule.type && candidate.name === rule.name);
      if (ref) {
        selected.set(ref.name, ref);
      }
      continue;
    }

    for (const ref of refs) {
      if (ref.kind !== rule.type) continue;
      if (!matchesPattern(ref.name, rule.pattern)) continue;
      selected.set(ref.name, ref);
    }
  }

  return Array.from(selected.values()).sort((left, right) => {
    if (left.name === config.versions.home) return -1;
    if (right.name === config.versions.home) return 1;
    if (left.kind !== right.kind) return left.kind === "branch" ? -1 : 1;
    if (left.kind === "tag" && right.kind === "tag") {
      return compareTagNames(left.name, right.name);
    }

    return left.name.localeCompare(right.name);
  });
}

function matchesPattern(value: string, pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped.replaceAll("*", ".*")}$`);
  return regex.test(value);
}
