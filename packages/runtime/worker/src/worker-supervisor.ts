import { spawn, type ChildProcess } from "node:child_process";
import type { SourceRuntimeAdapter } from "@scriptorium/runtime";
import type { WorkerCommand, WorkerMessage } from "./worker-protocol";

export interface WorkerProcess {
  connected: boolean;
  killed: boolean;
  kill(signal?: NodeJS.Signals | number): boolean;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
  on(event: "message", listener: (message: WorkerMessage) => void): this;
  send(message: WorkerCommand): boolean;
}

export function createWorkerSupervisor(options: {
  sourceAdapter: SourceRuntimeAdapter;
  workerEntryPath: string;
  instanceId: string;
  spawnWorker?: (workerEntryPath: string, instanceId: string) => WorkerProcess;
}) {
  const spawnWorker = options.spawnWorker ?? createWorkerProcess;
  let backgroundServiceHandle: { close(): void } | null = null;
  let child: WorkerProcess | null = null;
  let childOnline = false;
  let pendingPrepare = false;
  let prepareInFlight = false;
  let started = false;
  let closed = false;

  function start() {
    if (closed || started) {
      return;
    }

    started = true;
    requestPrepare();

    if (!backgroundServiceHandle && options.sourceAdapter.startBackgroundServices) {
      backgroundServiceHandle = options.sourceAdapter.startBackgroundServices({
        requestPrepare
      });
    }
  }

  async function requestPrepare() {
    if (closed) {
      return;
    }

    pendingPrepare = true;
    ensureChild();
    flushPrepare();
  }

  function close() {
    closed = true;
    pendingPrepare = false;
    prepareInFlight = false;

    backgroundServiceHandle?.close();
    backgroundServiceHandle = null;

    if (child?.connected) {
      child.send({ type: "shutdown" });
    } else {
      child?.kill();
    }

    child = null;
    childOnline = false;
  }

  function ensureChild() {
    if (closed || child) {
      return;
    }

    child = spawnWorker(options.workerEntryPath, options.instanceId);
    childOnline = false;

    child.on("message", (message) => {
      if (message.type === "online") {
        childOnline = true;
        flushPrepare();
        return;
      }

      if (message.type === "prepare-finished") {
        prepareInFlight = false;
        flushPrepare();
      }
    });

    child.on("error", () => {
      // The exit handler is responsible for recovery.
    });

    child.on("exit", () => {
      const hadPendingWork = prepareInFlight || pendingPrepare;

      child = null;
      childOnline = false;
      prepareInFlight = false;

      if (closed) {
        return;
      }

      if (hadPendingWork) {
        pendingPrepare = true;
      }

      ensureChild();
      flushPrepare();
    });
  }

  function flushPrepare() {
    if (!child || !childOnline || prepareInFlight || !pendingPrepare) {
      return;
    }

    pendingPrepare = false;
    prepareInFlight = true;
    child.send({ type: "prepare" });
  }

  return {
    start,
    requestPrepare,
    close
  };
}

function createWorkerProcess(workerEntryPath: string, instanceId: string): WorkerProcess {
  const child = spawn("bun", [workerEntryPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SCRIPTORIUM_RUNTIME_INSTANCE_ID: instanceId
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"]
  }) as ChildProcess;

  return {
    get connected() {
      return child.connected ?? false;
    },
    get killed() {
      return child.killed;
    },
    kill(signal) {
      return child.kill(signal);
    },
    on(event, listener) {
      child.on(event, listener as never);
      return this;
    },
    send(message) {
      return child.send(message);
    }
  };
}
