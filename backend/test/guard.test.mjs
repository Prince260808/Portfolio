import test from "node:test";
import assert from "node:assert/strict";
import { GuardedEmbeddings } from "../embeddingsGuard.js";

const opts = { delayMs: 0, retryWaitMs: 0, sleep: async () => {}, log: { log() {} } };

test("failed batches (silently empty) fall back to one-by-one and still succeed", async () => {
  const inner = {
    async embedDocuments(t) { return t.map(() => []); }, // swallowed failure, like the Google client
    async embedQuery() { return [0.1, 0.2]; },
  };
  const out = await new GuardedEmbeddings(inner, opts).embedDocuments(["a", "b", "c"]);
  assert.deepEqual(out, [[0.1, 0.2], [0.1, 0.2], [0.1, 0.2]]);
});

test("batches are small and a rate limit is retried", async () => {
  const sizes = [];
  let calls = 0;
  const inner = {
    async embedDocuments(t) { sizes.push(t.length); calls++; return calls === 1 ? t.map(() => []) : t.map(() => [1, 2]); },
    async embedQuery() { return [1, 2]; },
  };
  const texts = Array.from({ length: 25 }, (_, i) => `t${i}`);
  const out = await new GuardedEmbeddings(inner, { ...opts, batchSize: 10 }).embedDocuments(texts);
  assert.equal(out.length, 25);
  assert.ok(Math.max(...sizes) <= 10);
});

test("real underlying error is surfaced when everything fails", async () => {
  const inner = {
    async embedDocuments(t) { return t.map(() => []); },
    async embedQuery() { throw new Error("API key not valid"); },
  };
  await assert.rejects(new GuardedEmbeddings(inner, opts).embedDocuments(["a"]), /API key not valid/);
});

test("429 on single requests is retried then succeeds", async () => {
  let n = 0;
  const inner = {
    async embedDocuments(t) { return t.map(() => []); },
    async embedQuery() { n++; if (n < 3) { const e = new Error("429 quota exceeded"); throw e; } return [3, 4]; },
  };
  const out = await new GuardedEmbeddings(inner, opts).embedDocuments(["a"]);
  assert.deepEqual(out, [[3, 4]]);
});

test("valid vectors pass through for queries", async () => {
  const inner = { async embedDocuments(t) { return t.map(() => [1, 2]); }, async embedQuery() { return [1, 2]; } };
  assert.deepEqual(await new GuardedEmbeddings(inner, opts).embedQuery("a"), [1, 2]);
});
