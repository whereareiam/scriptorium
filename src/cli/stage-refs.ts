#!/usr/bin/env node

import path from "node:path";
import { stageProjectRefs } from "../lib/scriptorium/staging";

async function main() {
  const inputProjectRoot = process.argv[2] ?? ".";
  const inputOutputDir = process.argv[3];
  const projectRoot = path.resolve(process.cwd(), inputProjectRoot);
  const outputDir = inputOutputDir ? path.resolve(process.cwd(), inputOutputDir) : undefined;

  await stageProjectRefs({ projectRoot, outputDir });
  process.stdout.write(`Staged refs for ${projectRoot}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
