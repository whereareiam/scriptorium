import {
  collectPreparedSearchIndexes,
  exportPreparedSearchIndex
} from "./prepared-content";
import { getRuntimeInstanceId } from "./instance-id";
import { createSourceAdapter } from "./source-adapter";
import { runRuntimeWorker } from "./index";

runRuntimeWorker({
  createSourceAdapter,
  collectPreparedSearchIndexes,
  getRuntimeInstanceId,
  exportPreparedSearchIndex
});
