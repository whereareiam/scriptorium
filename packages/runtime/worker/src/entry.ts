import {
  exportPreparedSearchIndex,
  loadPreparedSource
} from "./prepared-content";
import { getRuntimeInstanceId } from "./instance-id";
import { createSourceAdapter } from "./source-adapter";
import { runRuntimeWorker } from "./index";

runRuntimeWorker({
  createSourceAdapter,
  getRuntimeInstanceId,
  loadPreparedSource,
  exportPreparedSearchIndex
});
