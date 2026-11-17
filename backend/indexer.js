import fs from "node:fs";
import crypto from "node:crypto";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { extractKnowledgeChunks, getProject, getSection } from "./knowledge.js";
import { createKeywordIndex } from "./rag.js";
import { describeError } from "./diagnose.js";
import { MemoryVectorIndex } from "./memoryIndex.js";

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1200, chunkOverlap: 150 });

export async function readPdfPages(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error("portfolio.pdf not found in the backend folder.");
  }
  const bytes = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText();
    const pages = (result.pages ?? [])
      .map((p, i) => ({ pageNumber: p.num ?? i + 1, text: p.text ?? "" }))
      .filter((p) => p.text.trim());
    if (!pages.length) throw new Error("No readable text found in portfolio.pdf.");
    return { pages, bytes };
  } finally {
    await parser.destroy();
  }
}

export async function buildDocuments(chunks) {
  const documents = [];
  for (const chunk of chunks) {
    const metadata = {
      chunk_id: chunk.chunkId,
      section: getSection(chunk.chunkId),
      project: getProject(chunk.chunkId),
      evidence_type: chunk.evidenceType,
      is_fact: chunk.isFact,
      source: "portfolio.pdf",
      page: chunk.page,
    };
    const pieces = await splitter.splitText(chunk.content);
    pieces.forEach((piece, i) => {
      documents.push({
        pageContent: i === 0 ? piece : `${chunk.chunkId} (continued): ${piece}`,
        metadata,
      });
    });
  }
  return documents;
}

async function buildQdrantStore({ state, qdrant: providedQdrant, connect, embeddings, documents, collectionName, collectionBase }) {
  state.status = "connecting to Qdrant";
  let qdrant;
  let exists;
  try {
    qdrant = providedQdrant ?? (await connect());
    ({ exists } = await qdrant.collectionExists(collectionName));
  } catch (error) {
    const wrapped = new Error(describeError(error, "Qdrant"));
    wrapped.qdrantUnreachable = true;
    throw wrapped;
  }

  let reuse = false;
  if (exists) {
    const info = await qdrant.getCollection(collectionName);
    reuse = (info.points_count ?? 0) === documents.length;
    if (!reuse) await qdrant.deleteCollection(collectionName); // incomplete earlier upload
  }

  let vectorStore;
  if (reuse) {
    console.log(`Reusing existing Qdrant collection ${collectionName}.`);
    vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      client: qdrant,
      collectionName,
    });
  } else {
    state.status = "embedding and uploading";
    console.log(`Indexing ${documents.length} documents into ${collectionName}...`);
    try {
      vectorStore = await QdrantVectorStore.fromDocuments(documents, embeddings, {
        client: qdrant,
        collectionName,
      });
    } catch (error) {
      throw new Error(`Embedding/upload failed (check GOOGLE_API_KEY and Qdrant): ${describeError(error, "embedding or Qdrant")}`);
    }
  }

  // Remove collections from older versions of the knowledge base.
  try {
    const { collections } = await qdrant.getCollections();
    for (const { name } of collections) {
      if (name.startsWith(collectionBase) && name !== collectionName) {
        await qdrant.deleteCollection(name);
        console.log(`Deleted old collection ${name}.`);
      }
    }
  } catch (error) {
    console.warn("Could not clean up old collections:", error?.message || error);
  }
  return vectorStore;
}

/**
 * Reads the PDF and prepares search. Uses Qdrant when configured and reachable;
 * otherwise (no QDRANT_URL, or Qdrant unreachable) falls back to an in-memory index,
 * so the chatbot works either way.
 */
export async function setupPortfolio({
  state,
  qdrant,
  connect,
  memoryOnly = false,
  cacheDir,
  embeddings,
  pdfPath,
  collectionBase = "prince_portfolio",
  embeddingModel = "gemini-embedding-001",
}) {
  state.status = "reading PDF";
  const { pages, bytes } = await readPdfPages(pdfPath);

  const chunks = extractKnowledgeChunks(pages);
  const factChunks = chunks.filter((c) => c.isFact);
  if (!chunks.length || !factChunks.length) {
    throw new Error("portfolio.pdf has no knowledge chunks or no Confirmed Facts Register.");
  }
  console.log(`PDF pages: ${pages.length}, chunks: ${chunks.length}, facts: ${factChunks.length}`);

  const documents = await buildDocuments(chunks);

  // Hash of PDF + embedding model: vectors are only rebuilt when the knowledge base changes.
  const hash = crypto.createHash("sha256").update(bytes).update(embeddingModel).digest("hex").slice(0, 12);
  const collectionName = `${collectionBase}_${hash}`;

  let vectorStore = null;
  let backend = "memory";

  if (!memoryOnly && (qdrant || connect)) {
    try {
      vectorStore = await buildQdrantStore({ state, qdrant, connect, embeddings, documents, collectionName, collectionBase });
      backend = "qdrant";
    } catch (error) {
      if (!error.qdrantUnreachable) throw error;
      console.warn(`Qdrant is unreachable, using the in-memory vector index instead.\n${error.message}`);
    }
  }

  if (!vectorStore) {
    state.status = "building in-memory index";
    vectorStore = await MemoryVectorIndex.build(embeddings, documents, { cacheKey: hash, cacheDir });
  }

  state.factChunks = factChunks;
  state.keywordIndex = createKeywordIndex(documents.filter((d) => !d.metadata.is_fact));
  state.vectorStore = vectorStore;
  state.vectorBackend = backend;
  state.ready = true;
  state.status = "ready";
  console.log(`PORTFOLIO KNOWLEDGE BASE READY (vector index: ${backend})`);
  return { collectionName, documents: documents.length, backend };
}

export async function setupWithRetry(options, { maxAttempts = 5, delayMs = 15_000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await setupPortfolio(options);
    } catch (error) {
      options.state.status = `error: ${String(error?.message || "unknown").split("\n")[0]}`;
      console.error(`Indexing attempt ${attempt}/${maxAttempts} failed: ${error?.message || error}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  console.error("Indexing failed permanently. Check keys, Qdrant URL and portfolio.pdf.");
  return null;
}
