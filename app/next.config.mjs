import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
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
