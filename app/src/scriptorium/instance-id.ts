export function getRuntimeInstanceId() {
  if (process.env.SCRIPTORIUM_RUNTIME_INSTANCE_ID) {
    return process.env.SCRIPTORIUM_RUNTIME_INSTANCE_ID;
  }

  return String(process.ppid && process.ppid > 1 ? process.ppid : process.pid);
}
