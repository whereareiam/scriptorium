import { setTimeout as delay } from "node:timers/promises";

/** Retry transient transport failures within a single preparation request. */
export async function retryNetworkFetch<T>(operation: () => Promise<T>, wait: (ms: number) => Promise<unknown> = delay): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const transient = /could not resolve (host|hostname)|failed to connect|connection.*(reset|timed out)|operation timed out|remote end hung up|early EOF|HTTP.*(502|503|504)|TLS connection was non-properly terminated/i.test(message);
      if (!transient || attempt >= 4)
        throw error;
      console.warn(JSON.stringify({ event: "git_fetch_retry", attempt: attempt + 2 }));
      await wait(1000 * 2 ** attempt);
    }
  }
}
