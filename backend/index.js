import "dotenv/config";
import dns from "node:dns";

// Some networks have broken IPv6 routes, which shows up as ECONNRESET / timeouts.
dns.setDefaultResultOrder("ipv4first");
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ChatGroq } from "@langchain/groq";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { createApp } from "./app.js";
import { setupWithRetry } from "./indexer.js";
import { connectQdrant } from "./qdrantConnect.js";
import { GuardedEmbeddings } from "./embeddingsGuard.js";

// =====================================================
// CONFIGURATION
// =====================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, "portfolio.pdf");

const requiredEnv = ["GROQ_API_KEY", "GOOGLE_API_KEY"]; // Qdrant is optional
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key} (see .env.example)`);
  }
}

const LLM_MODEL = process.env.LLM_MODEL || "openai/gpt-oss-120b";
const EMBEDDING_MODEL = "gemini-embedding-001";
const COLLECTION_BASE = "prince_portfolio";
const MIN_SCORE = Number(process.env.RETRIEVAL_MIN_SCORE) || 0.35;

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: LLM_MODEL,
  temperature: 0,
});

const embeddings = new GuardedEmbeddings(
  new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: EMBEDDING_MODEL,
  })
);

// Resolved lazily: tries the configured URL, then fallbacks (e.g. https on port 443).
let qdrantPromise;
const useQdrant = Boolean((process.env.QDRANT_URL || "").trim()) && process.env.VECTOR_STORE !== "memory";
const connect = () =>
  (qdrantPromise ??= connectQdrant({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY || "",
  }).catch((error) => {
    qdrantPromise = undefined; // allow retry
    throw error;
  }));

// Shared with the HTTP app.
const state = { ready: false, vectorStore: null, factChunks: [], status: "starting" };

// =====================================================
// START
// =====================================================

const app = createApp({ state, llm, allowedOrigins, minScore: MIN_SCORE });
const port = Number(process.env.PORT) || 5000;

// Listen first so hosts like Render see an open port; /health reports readiness.
app.listen(port, () => {
  console.log(`Portfolio API listening on ${port} (health: /health)`);
  setupWithRetry({
    state,
    connect: useQdrant ? connect : undefined,
    memoryOnly: !useQdrant,
    cacheDir: path.join(__dirname, "vectors"), // committed, pre-built vectors (npm run build:vectors)
    embeddings,
    pdfPath: PDF_PATH,
    collectionBase: COLLECTION_BASE,
    embeddingModel: EMBEDDING_MODEL,
  });
});
