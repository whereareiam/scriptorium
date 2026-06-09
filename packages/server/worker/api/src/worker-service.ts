import type { PrepareRequest } from "./models/prepare-request";

export interface WorkerService {
  start(): void;
  requestPrepare(request?: PrepareRequest): Promise<void>;
  close?(): void;
}
