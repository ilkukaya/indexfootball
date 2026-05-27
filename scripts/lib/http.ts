/**
 * Small HTTP helpers for the data pipeline: polite, retrying fetch for JSON and
 * binary downloads. Used by the TheSportsDB / Wikidata enrichment scripts.
 */
const USER_AGENT =
  "IndexFootballBot/0.1 (+https://indexfootball.com; static encyclopedia build)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchOptions {
  retries?: number;
  /** Politeness delay applied before each attempt (ms). */
  delay?: number;
}

async function withRetry<T>(
  label: string,
  attempt: () => Promise<T>,
  retries: number,
  delay: number,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i += 1) {
    if (delay) await sleep(delay);
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const backoff = 2 ** i * 1000;
      console.warn(`  ${label} failed (attempt ${i + 1}): ${String(error)}`);
      if (i < retries) await sleep(backoff);
    }
  }
  throw lastError;
}

export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;
  return withRetry(
    `GET ${url}`,
    async () => {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    },
    retries,
    delay,
  );
}

/** Download a binary resource into an ArrayBuffer (e.g. a club crest). */
export async function fetchBuffer(
  url: string,
  options: FetchOptions = {},
): Promise<Buffer> {
  const { retries = 3, delay = 500 } = options;
  return withRetry(
    `GET ${url}`,
    async () => {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    retries,
    delay,
  );
}
