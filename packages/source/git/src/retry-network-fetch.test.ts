import { expect, test } from "bun:test";
import { retryNetworkFetch } from "./retry-network-fetch";

test("transient DNS failures retry within the current request", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const result = await retryNetworkFetch(async () => {
    if (++attempts < 3) throw new Error("Could not resolve host: github.com");
    return "fetched";
  }, async ms => { delays.push(ms); });
  expect(result).toBe("fetched");
  expect(delays).toEqual([1000, 2000]);
});

test("persistent transport errors stop after three attempts and authentication errors are not retried", async () => {
  for (const [message, expectedAttempts] of [["Could not resolve host: github.com", 3], ["Authentication failed", 1]] as const) {
    let attempts = 0;
    await expect(retryNetworkFetch(async () => { attempts++; throw new Error(message); }, async () => {})).rejects.toThrow(message);
    expect(attempts).toBe(expectedAttempts);
  }
});
