import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const configPath = path.resolve(process.cwd(), "scriptorium.json");

if (process.env.SCRIPTORIUM_CONFIG_JSON) {
  const raw = process.env.SCRIPTORIUM_CONFIG_JSON;
  try {
    JSON.parse(raw);
  } catch (error) {
    console.error("SCRIPTORIUM_CONFIG_JSON is not valid JSON.");
    throw error;
  }

  writeFileSync(configPath, raw);
  process.exit(0);
}

if (hasSourceEnvOverrides()) {
  writeFileSync(configPath, JSON.stringify(buildConfigFromEnv(), null, 2));
  process.exit(0);
}

if (existsSync(configPath)) {
  validateConfigFile(configPath);
  process.exit(0);
}

console.error("No runtime config provided. Mount app/scriptorium.json or set SCRIPTORIUM_* environment variables.");
process.exit(1);

function hasSourceEnvOverrides() {
  return Boolean(
    process.env.SCRIPTORIUM_SOURCE_TYPE ||
    process.env.SCRIPTORIUM_PROJECT_ROOT ||
    process.env.SCRIPTORIUM_REPO_URL ||
    process.env.SCRIPTORIUM_DEFAULT_BRANCH ||
    process.env.SCRIPTORIUM_REFRESH_INTERVAL_SECONDS ||
    process.env.SCRIPTORIUM_DATA_DIR ||
    process.env.SCRIPTORIUM_WEBHOOK_SECRET ||
    process.env.SCRIPTORIUM_GIT_AUTH_TOKEN ||
    process.env.SCRIPTORIUM_GIT_AUTH_USERNAME
  );
}

function buildConfigFromEnv() {
  const sourceType = process.env.SCRIPTORIUM_SOURCE_TYPE || (process.env.SCRIPTORIUM_REPO_URL ? "git" : "local");

  if (sourceType === "git" && !process.env.SCRIPTORIUM_REPO_URL) {
    throw new Error("SCRIPTORIUM_REPO_URL is required when SCRIPTORIUM_SOURCE_TYPE=git");
  }

  if (sourceType === "local" && !process.env.SCRIPTORIUM_PROJECT_ROOT) {
    throw new Error("SCRIPTORIUM_PROJECT_ROOT is required when SCRIPTORIUM_SOURCE_TYPE=local");
  }

  const target = sourceType === "git"
    ? process.env.SCRIPTORIUM_REPO_URL
    : process.env.SCRIPTORIUM_PROJECT_ROOT;

  return {
    source: {
      type: sourceType,
      ...(target ? { target } : {}),
      ...(process.env.SCRIPTORIUM_DEFAULT_BRANCH ? { defaultBranch: process.env.SCRIPTORIUM_DEFAULT_BRANCH } : {}),
      ...(
        process.env.SCRIPTORIUM_GIT_AUTH_TOKEN || process.env.SCRIPTORIUM_GIT_AUTH_USERNAME
          ? {
              auth: {
                ...(process.env.SCRIPTORIUM_GIT_AUTH_TOKEN ? { token: process.env.SCRIPTORIUM_GIT_AUTH_TOKEN } : {}),
                ...(process.env.SCRIPTORIUM_GIT_AUTH_USERNAME ? { username: process.env.SCRIPTORIUM_GIT_AUTH_USERNAME } : {})
              }
            }
          : {}
      )
    },
    ...(
      process.env.SCRIPTORIUM_REFRESH_INTERVAL_SECONDS || process.env.SCRIPTORIUM_DATA_DIR
        ? {
            runtime: {
              ...(process.env.SCRIPTORIUM_REFRESH_INTERVAL_SECONDS ? { refreshIntervalSeconds: Number(process.env.SCRIPTORIUM_REFRESH_INTERVAL_SECONDS) } : {}),
              ...(process.env.SCRIPTORIUM_DATA_DIR ? { dataDir: process.env.SCRIPTORIUM_DATA_DIR } : {})
            }
          }
        : {}
    ),
    ...(
      process.env.SCRIPTORIUM_WEBHOOK_SECRET
        ? {
            triggers: {
              webhook: {
                secret: process.env.SCRIPTORIUM_WEBHOOK_SECRET
              }
            }
          }
        : {}
    )
  };
}

function validateConfigFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  JSON.parse(raw);
}
