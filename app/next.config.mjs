import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: [
    "@scriptorium/content",
    "@scriptorium/core",
    "@scriptorium/bundle",
    "@scriptorium/source-git",
    "@scriptorium/source-local",
    "@scriptorium/runtime",
    "@scriptorium/ui"
  ],
  outputFileTracingRoot: path.join(__dirname, "..")
};

export default config;
