import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { createGitHubTriggerHandler } from "./index";

test("a valid webhook is acknowledged while preparation is still running", async () => {
  let finish!: () => void;
  let called = false;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const handler = createGitHubTriggerHandler({
    secret: "test",
    workerService: { start() {}, close() {}, requestPrepare() { called = true; return pending; } }
  });
  const body = "{}";
  const response = await handler.handle(new Request("http://localhost/webhook", {
    method: "POST", body,
    headers: { "x-github-event": "push", "x-hub-signature-256": `sha256=${createHmac("sha256", "test").update(body).digest("hex")}` }
  }));
  expect(called).toBe(true);
  expect(response.status).toBe(202);
  finish();
  const rejected = await handler.handle(new Request("http://localhost/webhook", { method: "POST", body }));
  expect(rejected.status).toBe(401);
});
