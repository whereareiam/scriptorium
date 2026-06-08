import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it } from "bun:test";
import type { SourceRuntimeAdapter } from "@scriptorium/runtime";
import { createWorkerSupervisor } from "./supervisor";
import type { WorkerCommand, WorkerMessage } from "./protocol";

class FakeWorkerProcess extends EventEmitter {
  connected = true;
  killed = false;
  readonly sent: WorkerCommand[] = [];

  kill() {
    this.killed = true;
    this.connected = false;
    return true;
  }

  send(message: WorkerCommand) {
    this.sent.push(message);
    return true;
  }

  emitMessage(message: WorkerMessage) {
    this.emit("message", message);
  }

  emitExit(code: number | null = 1) {
    this.connected = false;
    this.emit("exit", code, null);
  }
}

const createdWorkers: FakeWorkerProcess[] = [];

afterEach(() => {
  createdWorkers.length = 0;
});

describe("createWorkerSupervisor", () => {
  it("starts with one eager prepare request", async () => {
    const supervisor = createWorkerSupervisor({
      sourceAdapter: createSourceAdapterStub(),
      spawnWorker() {
        const worker = new FakeWorkerProcess();
        createdWorkers.push(worker);
        return worker;
      }
    });

    supervisor.start();
    expect(createdWorkers).toHaveLength(1);

    createdWorkers[0].emitMessage({ type: "online" });

    expect(createdWorkers[0].sent).toEqual([{ type: "prepare" }]);
  });

  it("coalesces repeated prepare requests while a run is active", async () => {
    const supervisor = createWorkerSupervisor({
      sourceAdapter: createSourceAdapterStub(),
      spawnWorker() {
        const worker = new FakeWorkerProcess();
        createdWorkers.push(worker);
        return worker;
      }
    });

    supervisor.start();
    const worker = createdWorkers[0];
    worker.emitMessage({ type: "online" });

    await supervisor.requestPrepare();
    await supervisor.requestPrepare();

    expect(worker.sent).toEqual([{ type: "prepare" }]);

    worker.emitMessage({ type: "prepare-finished" });

    expect(worker.sent).toEqual([
      { type: "prepare" },
      { type: "prepare" }
    ]);
  });

  it("respawns and retries when the child exits during an active prepare", async () => {
    const supervisor = createWorkerSupervisor({
      sourceAdapter: createSourceAdapterStub(),
      spawnWorker() {
        const worker = new FakeWorkerProcess();
        createdWorkers.push(worker);
        return worker;
      }
    });

    supervisor.start();
    const firstWorker = createdWorkers[0];
    firstWorker.emitMessage({ type: "online" });
    expect(firstWorker.sent).toEqual([{ type: "prepare" }]);

    firstWorker.emitExit();

    expect(createdWorkers).toHaveLength(2);

    const secondWorker = createdWorkers[1];
    secondWorker.emitMessage({ type: "online" });

    expect(secondWorker.sent).toEqual([{ type: "prepare" }]);
  });
});

function createSourceAdapterStub(): SourceRuntimeAdapter {
  return {
    type: "git",
    shouldHydratePreparedContent() {
      return true;
    },
    async prepareRepository() {
      throw new Error("Not implemented in tests.");
    },
    async loadProjectConfigForWarmup() {
      return null;
    }
  };
}
