import {
  buildPreparedSearchDatabase,
  exportPreparedSearchIndex
} from "./prepared-content";
import { getRuntimeInstanceId } from "./instance-id";
import { createSourceAdapter } from "./source-adapter";
import { runRuntimeWorker } from "./index";

runRuntimeWorker({
  buildPreparedSearchDatabase,
  createSourceAdapter,
  getRuntimeInstanceId,
  exportPreparedSearchIndex
});
