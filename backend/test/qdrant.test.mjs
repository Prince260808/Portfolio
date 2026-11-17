import test from "node:test";
import assert from "node:assert/strict";
import { buildCandidates, connectQdrant } from "../qdrantConnect.js";

const quiet = { log() {}, warn() {} };

test("candidates: cloud URL gets port-443 and https fallbacks; local gets none", () => {
  assert.deepEqual(buildCandidates("http://localhost:6333"), ["http://localhost:6333"]);
  const c = buildCandidates('"abc.cloud.qdrant.io:6333/"');
  assert.equal(c[0], "https://abc.cloud.qdrant.io:6333");
  assert.ok(c.includes("https://abc.cloud.qdrant.io:443"));
  const h = buildCandidates("http://abc.cloud.qdrant.io:6333");
  assert.ok(h.includes("https://abc.cloud.qdrant.io:6333"));
});

test("falls back to the next URL when the first resets (ECONNRESET)", async () => {
  const tried = [];
  const makeClient = ({ url }) => ({
    url,
    async getCollections() {
      tried.push(url);
      if (!url.endsWith(":443")) {
        const e = new Error("fetch failed");
        e.cause = { code: "ECONNRESET", message: "read ECONNRESET" };
        throw e;
      }
      return { collections: [] };
    },
  });
  const client = await connectQdrant({ url: "https://abc.cloud.qdrant.io:6333", apiKey: "k", makeClient, log: quiet });
  assert.equal(client.url, "https://abc.cloud.qdrant.io:443");
  assert.equal(tried[0], "https://abc.cloud.qdrant.io:6333");
});

test("reports every attempt when all addresses fail", async () => {
  const makeClient = () => ({
    async getCollections() {
      const e = new Error("fetch failed");
      e.cause = { code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND" };
      throw e;
    },
  });
  await assert.rejects(
    connectQdrant({ url: "https://nope.cloud.qdrant.io", apiKey: "k", makeClient, log: quiet }),
    /Could not reach Qdrant on any address[\s\S]*:443/
  );
});
