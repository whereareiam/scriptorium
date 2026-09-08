import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const temporary = await mkdtemp(path.join(os.tmpdir(), "scriptorium-production-"));
const source = path.join(temporary, "source");
const runtime = path.join(temporary, "runtime");
const app = path.resolve("app/.next/standalone/app");
const configPath = path.join(app, "scriptorium.json");
let previousConfig;
try { previousConfig = await readFile(configPath); } catch {}
let child;
let logs = "";
const checkedFetch = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
const waitFor = async (check, description) => {
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    try { if (await check()) return; } catch {}
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error("Production server exited");
    await delay(100);
  }
  throw new Error(`Timed out: ${description}`);
};
try {
  await mkdir(path.join(source, "docs/content"), { recursive: true });
  await writeFile(path.join(source, "scriptorium.project.json"), JSON.stringify({ name: "Cache fixture", logo: "docs/assets/logo.svg", versions: { home: "dev" } }));
  const page = path.join(source, "docs/content/index.mdx");
  await writeFile(page, "---\ntitle: Cache fixture\n---\nInitial documentation.\n");
  const git = (...args) => execFileSync("git", args, { cwd: source, stdio: "pipe" });
  git("init", "--initial-branch", "dev");
  git("config", "user.name", "Scriptorium Test");
  git("config", "user.email", "scriptorium@example.invalid");
  git("config", "commit.gpgSign", "false");
  const commit = () => { git("add", "."); git("commit", "-m", "Update fixture"); };
  commit();
  await writeFile(configPath, JSON.stringify({ source: { type: "git", target: source, defaultBranch: "dev" }, runtime: { dataDir: runtime }, triggers: { webhook: { secret: "test-secret" } } }));
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  child = spawn(process.execPath, ["server.js"], { cwd: app, env: { ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const state = async () => JSON.parse(await readFile(path.join(runtime, "state.json"), "utf8"));
  await waitFor(async () => { await checkedFetch(base + "/api/health/ready"); return (await state()).phase === "ready"; }, "initial bundle");
  const initial = await state();
  console.log("Checking production HTML and request variants");
  const html = await checkedFetch(base + "/docs/dev");
  assert.equal(html.headers.get("cloudflare-cdn-cache-control"), "public, max-age=30");
  assert.match(html.headers.get("content-type"), /text\/html/);
  await html.arrayBuffer();
  for (const headers of [{ RSC: "1" }, { RSC: "1", "Next-Router-Prefetch": "1" }, { Authorization: "Bearer fixture" }, { Cookie: "fixture=1" }]) {
    console.log("Checking headers", JSON.stringify(headers));
    const response = await checkedFetch(base + "/docs/dev", { headers });
    assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store", JSON.stringify(headers));
    if (headers.RSC) assert.match(response.headers.get("content-type"), /text\/x-component/);
    await response.arrayBuffer();
  }
  for (const route of ["/docs/dev?_rsc=invalid", "/docs/dev?tracking=fixture", "/api/health", "/api/health/ready"]) {
    console.log("Checking route", route);
    const response = await checkedFetch(base + route);
    assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store", route);
    await response.arrayBuffer();
  }
  const search = await checkedFetch(base + "/api/search?ref=dev");
  assert.equal(search.headers.get("cloudflare-cdn-cache-control"), "public, max-age=30");
  await search.arrayBuffer();
  await writeFile(page, "---\ntitle: Cache fixture\n---\nUpdated through webhook.\n");
  commit();
  const body = '{"ref":"refs/heads/dev"}';
  const signature = "sha256=" + createHmac("sha256", "test-secret").update(body).digest("hex");
  const accepted = await checkedFetch(base + "/api/source/github/webhook", { method: "POST", body, headers: { "x-github-event": "push", "x-hub-signature-256": signature } });
  assert.equal(accepted.status, 202);
  await accepted.arrayBuffer();
  await waitFor(async () => { const s = await state(); return s.phase === "ready" && s.activeGenerationId !== initial.activeGenerationId; }, "webhook publication");
  const fresh = await checkedFetch(base + "/docs/dev", { headers: { RSC: "1" } });
  assert.equal(fresh.headers.get("cloudflare-cdn-cache-control"), "no-store");
  assert.ok((await fresh.text()).includes("Updated through webhook."));
  console.log("Production verification passed: HTML/search cache headers, RSC/auth/cookie/query bypass, health bypass, and webhook publication.");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    await new Promise(resolve => {
      const timeout = setTimeout(() => child.kill("SIGKILL"), 2000);
      child.once("exit", () => { clearTimeout(timeout); resolve(); });
      child.kill("SIGTERM");
    });
  }
  if (previousConfig) await writeFile(configPath, previousConfig);
  else await rm(configPath, { force: true });
  await rm(temporary, { recursive: true, force: true });
}
