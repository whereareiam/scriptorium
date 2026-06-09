export interface RuntimeMemorySnapshot {
  rss_bytes: number;
  heap_used_bytes: number;
  heap_total_bytes: number;
  external_bytes: number;
}

export function getRuntimeMemorySnapshot(): RuntimeMemorySnapshot {
  const snapshot = process.memoryUsage();

  return {
    rss_bytes: snapshot.rss,
    heap_used_bytes: snapshot.heapUsed,
    heap_total_bytes: snapshot.heapTotal,
    external_bytes: snapshot.external
  };
}
