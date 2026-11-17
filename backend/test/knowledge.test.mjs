import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPdfPages } from "../indexer.js";
import { extractKnowledgeChunks } from "../knowledge.js";
import { createKeywordIndex } from "../rag.js";

const pdf = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "portfolio.pdf");
const { pages } = await readPdfPages(pdf);
const chunks = extractKnowledgeChunks(pages);

test("every chunk ID is unique and facts register is present", () => {
  const ids = chunks.map((c) => c.chunkId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(chunks.filter((c) => c.isFact).length >= 28);
  assert.ok(!ids.some((id) => id.startsWith("KB-9.")), "instruction chunks must not be indexed");
});

test("no page footers or cross-reference splits leak into chunks", () => {
  for (const c of chunks) assert.ok(!/Page \d+$/m.test(c.content), c.chunkId);
  const kb41 = chunks.find((c) => c.chunkId === "KB-4.1");
  assert.match(kb41.content, /zevox-tech-store\.vercel\.app/);
});

test("all resume URLs survive extraction intact", () => {
  const all = chunks.map((c) => c.content).join("\n");
  for (const url of [
    "https://github.com/Prince260808",
    "https://linkedin.com/in/prince-gupta-0b297538b",
    "https://ai-automation-1-moc9.onrender.com",
    "https://github.com/Prince260808/AI-Automation",
    "https://zevox-tech-store.vercel.app/",
    "https://github.com/Prince260808/ZEVOX---Tech-Store",
    "https://github.com/Prince260808/AgentForge-AI",
  ]) {
    assert.ok(all.includes(url), url);
  }
});

test("keyword search finds exact technology chunks", () => {
  const idx = createKeywordIndex(
    chunks.filter((c) => !c.isFact).map((c) => ({ pageContent: c.content, metadata: { chunk_id: c.chunkId } }))
  );
  const top = idx.search("How does Razorpay verification work?", 4).map((d) => d.metadata.chunk_id);
  assert.ok(top.includes("KB-4.9"));
});
