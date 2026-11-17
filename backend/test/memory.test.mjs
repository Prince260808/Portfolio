import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setupPortfolio } from "../indexer.js";

const pdfPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "portfolio.pdf");

// Deterministic stand-in for Gemini embeddings (hashed bag-of-words).
function makeEmbeddings() {
  const stats = { docCalls: 0 };
  const vec = (t) => {
    const v = new Array(256).fill(0);
    for (const w of t.toLowerCase().match(/[a-z0-9.+#]+/g) || []) v[crypto.createHash("md5").update(w).digest()[0]] += 1;
    return v;
  };
  return {
    stats,
    async embedDocuments(ts) { stats.docCalls++; return ts.map(vec); },
    async embedQuery(t) { return vec(t); },
  };
}
const fresh = () => ({ ready: false, vectorStore: null, factChunks: [], status: "x" });
const quietConsole = () => { const w = console.warn; console.warn = () => {}; return () => { console.warn = w; }; };

test("no Qdrant configured: in-memory index works and is cached on disk", async () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-cache-"));
  const emb = makeEmbeddings();
  const state = fresh();
  const r = await setupPortfolio({ state, embeddings: emb, pdfPath, memoryOnly: true, cacheDir });
  assert.equal(r.backend, "memory");
  assert.equal(state.ready, true);
  const hits = await state.vectorStore.similaritySearchWithScore("Razorpay payment verification", 3);
  assert.equal(hits.length, 3);
  assert.ok(hits[0][1] >= hits[2][1]);

  const state2 = fresh();
  await setupPortfolio({ state: state2, embeddings: emb, pdfPath, memoryOnly: true, cacheDir });
  assert.equal(emb.stats.docCalls, 1, "second start must reuse cached vectors");
});

test("Qdrant unreachable (ECONNRESET): falls back to in-memory index instead of failing", async () => {
  const restore = quietConsole();
  try {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-cache-"));
    const connect = async () => {
      const e = new Error("fetch failed");
      e.cause = { code: "ECONNRESET", message: "read ECONNRESET" };
      throw e;
    };
    const state = fresh();
    const r = await setupPortfolio({ state, connect, embeddings: makeEmbeddings(), pdfPath, cacheDir });
    assert.equal(r.backend, "memory");
    assert.equal(state.vectorBackend, "memory");
    assert.ok(state.ready);
  } finally {
    restore();
  }
});
