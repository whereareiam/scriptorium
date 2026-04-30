#!/usr/bin/env node

import { getLocalProjectRoot } from "../lib/scriptorium/runtime-config";
import { stageProjectRefs } from "../lib/scriptorium/staging";

async function main() {
  if (process.env.SCRIPTORIUM_REPO_URL) {
    process.stdout.write("Skipping local example staging because SCRIPTORIUM_REPO_URL is set.\n");
    return;
  }

  const projectRoot = getLocalProjectRoot();
  await stageProjectRefs({ projectRoot });
  process.stdout.write(`Prepared local example from ${projectRoot}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
