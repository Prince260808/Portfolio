import fs from "node:fs";
import path from "node:path";

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Tiny in-memory vector index with the same search method the app uses
 * (similaritySearchWithScore). Perfectly adequate for a few hundred chunks, and it
 * removes the need for an external vector database.
 * Vectors are cached on disk so restarts don't re-embed the documents.
 */
export class MemoryVectorIndex {
  constructor(embeddings, items) {
    this.embeddings = embeddings;
    this.items = items; // [{ doc, vector }]
  }

  static async build(embeddings, documents, { cacheKey, cacheDir } = {}) {
    const cacheFile = cacheKey && cacheDir ? path.join(cacheDir, `vectors-${cacheKey}.json`) : null;

    let vectors = null;
    if (cacheFile && fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        if (
          Array.isArray(cached) &&
          cached.length === documents.length &&
          cached.every((v) => Array.isArray(v) && v.length > 0)
        ) {
          vectors = cached;
          console.log(`Loaded ${vectors.length} cached vectors.`);
        }
      } catch {
        /* ignore a corrupt cache */
      }
    }

    if (!vectors) {
      console.log(`Embedding ${documents.length} documents (in-memory index)...`);
      vectors = await embeddings.embedDocuments(documents.map((d) => d.pageContent));
      if (cacheFile) {
        try {
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(cacheFile, JSON.stringify(vectors));
        } catch (error) {
          console.warn("Could not write vector cache:", error?.message);
        }
      }
    }

    return new MemoryVectorIndex(
      embeddings,
      documents.map((doc, i) => ({ doc, vector: vectors[i] }))
    );
  }

  async similaritySearchWithScore(query, k = 4) {
    const q = await this.embeddings.embedQuery(query);
    return this.items
      .map(({ doc, vector }) => [doc, cosine(q, vector)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
  }
}
