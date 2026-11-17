import { Embeddings } from "@langchain/core/embeddings";

const validVector = (v) => Array.isArray(v) && v.length > 0 && v.every((n) => Number.isFinite(n));
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRateLimit = (e) => /429|quota|rate.?limit|RESOURCE_EXHAUSTED|too many/i.test(`${e?.status} ${e?.message}`);

/**
 * Wraps the Google embeddings client because:
 *  1. it can swallow a failed batch request and silently return EMPTY vectors, and
 *  2. a large batch counts as many requests against the free-tier rate limit (~100/min).
 * We therefore send small paced batches, retry after a pause, fall back to one text per
 * request, and throw a clear error if vectors are still invalid (never return empties).
 */
export class GuardedEmbeddings extends Embeddings {
  constructor(inner, { batchSize = 10, delayMs = 1000, retryWaitMs = 15_000, sleep = defaultSleep, log = console } = {}) {
    super({});
    this.inner = inner;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.retryWaitMs = retryWaitMs;
    this.sleep = sleep;
    this.log = log;
  }

  async #single(text) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const v = await this.inner.embedQuery(text);
        if (validVector(v)) return v;
        throw new Error("The embedding API returned an empty vector (check GOOGLE_API_KEY and quota).");
      } catch (error) {
        if (attempt < 5 && isRateLimit(error)) {
          await this.sleep(this.retryWaitMs * attempt);
          continue;
        }
        throw error;
      }
    }
  }

  async #batch(texts) {
    try {
      const vectors = await this.inner.embedDocuments(texts);
      if (Array.isArray(vectors) && vectors.length === texts.length && vectors.every(validVector)) return vectors;
    } catch {
      /* fall through to retry */
    }
    await this.sleep(this.retryWaitMs); // most often a rate limit: wait, then retry once
    try {
      const vectors = await this.inner.embedDocuments(texts);
      if (Array.isArray(vectors) && vectors.length === texts.length && vectors.every(validVector)) return vectors;
    } catch {
      /* fall through to one-by-one */
    }
    const out = [];
    for (const t of texts) {
      out.push(await this.#single(t)); // throws the real error (bad key, quota, network)
      await this.sleep(this.delayMs);
    }
    return out;
  }

  async embedDocuments(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      out.push(...(await this.#batch(texts.slice(i, i + this.batchSize))));
      this.log.log(`Embedded ${Math.min(i + this.batchSize, texts.length)}/${texts.length}`);
      if (i + this.batchSize < texts.length) await this.sleep(this.delayMs);
    }
    return out;
  }

  async embedQuery(text) {
    return this.#single(text);
  }
}
