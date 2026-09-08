import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  // Preserve RSC headers and query parameters for safe shared-cache decisions.
  skipProxyUrlNormalize: true,
  reactStrictMode: true,
  transpilePackages: [
    "@scriptorium/server",
    "@scriptorium/server-api",
    "@scriptorium/server-worker-api",
    "@scriptorium/server-worker",
    "@scriptorium/source-api",
    "@scriptorium/source-git",
    "@scriptorium/source-local",
    "@scriptorium/trigger-api",
    "@scriptorium/trigger-github",
    "@scriptorium/ui"
  ],
  outputFileTracingRoot: path.join(__dirname, "..")
};

export default config;
