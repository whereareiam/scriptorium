import {
  getLocalProjectRoot,
  getRuntimeConfig,
  getRuntimePaths,
  resolveSourceRuntimeAdapter,
  type SourceRuntimeAdapter,
  type SourceRuntimeAdapterFactories
} from "@scriptorium/runtime";
import { createGitSourceRuntimeAdapter } from "@scriptorium/runtime-source-git";
import { createLocalSourceRuntimeAdapter } from "@scriptorium/runtime-source-local";

const sourceAdapters = {
  git() {
    return createGitSourceRuntimeAdapter({
      getRuntimeConfig,
      getRuntimePaths
    });
  },
  local() {
    return createLocalSourceRuntimeAdapter({
      getLocalProjectRoot
    });
  }
} satisfies SourceRuntimeAdapterFactories<ReturnType<typeof getRuntimeConfig>["source"]["type"]>;

export function createSourceAdapter(): SourceRuntimeAdapter {
  return resolveSourceRuntimeAdapter(getRuntimeConfig().source.type, sourceAdapters);
}
