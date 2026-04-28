/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@scriptorium/site-runtime"]
};

export default config;

