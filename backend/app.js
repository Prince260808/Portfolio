import express from "express";
import cors from "cors";
import {
  NOT_FOUND_MESSAGE,
  buildRetrievalQuery,
  buildSystemPrompt,
  createRateLimiter,
  formatFacts,
  formatRetrieved,
  sanitizeHistory,
} from "./rag.js";

const TOP_K = 6;
const KEYWORD_K = 4;
const MAX_CHUNKS = 8;

/**
 * @param {object} deps
 * @param {{ready:boolean, vectorStore:any, keywordIndex?:any, factChunks:any[], status:string}} deps.state
 * @param {{invoke:(messages:any[])=>Promise<any>}} deps.llm
 * @param {string[]} deps.allowedOrigins
 * @param {number} deps.minScore
 */
export function createApp({ state, llm, allowedOrigins, minScore }) {
  const app = express();

  // Render / Vercel / most hosts sit behind one proxy.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin tools (curl, health checks) and listed frontends.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"));
      },
    })
  );
  app.use(express.json({ limit: "20kb" }));

  app.get("/", (req, res) => {
    res.json({ service: "Prince Gupta portfolio RAG API", ready: state.ready });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", ready: state.ready, indexing: state.status, vectorIndex: state.vectorBackend ?? null });
  });

  app.post("/ask", createRateLimiter({ windowMs: 60_000, max: 20 }), async (req, res) => {
    try {
      const { question, history } = req.body ?? {};

      if (typeof question !== "string" || !question.trim() || question.trim().length > 500) {
        return res.status(400).json({ error: "Enter a question of up to 500 characters." });
      }

      if (!state.ready || !state.vectorStore) {
        return res.status(503).json({
          error: "The portfolio knowledge base is still starting up. Please try again in a moment.",
        });
      }

      const cleanQuestion = question.trim();
      const cleanHistory = sanitizeHistory(history);

      // 1. Retrieve the most relevant knowledge-base chunks.
      const query = buildRetrievalQuery(cleanQuestion, cleanHistory);
      const scored = await state.vectorStore.similaritySearchWithScore(query, TOP_K);

      const retrievedDocs = [];
      const seen = new Set();
      const add = (doc) => {
        if (doc.metadata?.is_fact || seen.has(doc.pageContent)) return;
        if (retrievedDocs.length >= MAX_CHUNKS) return;
        seen.add(doc.pageContent);
        retrievedDocs.push(doc);
      };

      // Semantic (vector) hits above the similarity threshold...
      for (const [doc, score] of scored) {
        if (score < minScore) continue;
        add(doc);
        if (process.env.DEBUG_RAG) console.log(`  vector ${doc.metadata?.chunk_id} score=${score.toFixed(3)}`);
      }
      // ...plus exact-keyword hits (technology names etc.).
      for (const doc of state.keywordIndex?.search(query, KEYWORD_K) ?? []) {
        add(doc);
        if (process.env.DEBUG_RAG) console.log(`  keyword ${doc.metadata?.chunk_id}`);
      }

      // 2. Always include the whole Confirmed Facts Register (small, authoritative).
      const systemPrompt = buildSystemPrompt({
        facts: formatFacts(state.factChunks),
        retrieved: formatRetrieved(retrievedDocs),
      });

      // 3. Ask the model, strictly grounded.
      const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        ...cleanHistory,
        { role: "user", content: cleanQuestion },
      ]);

      let answer = "";
      if (typeof response.content === "string") {
        answer = response.content;
      } else if (Array.isArray(response.content)) {
        answer = response.content
          .map((p) => (typeof p === "string" ? p : p?.type === "text" ? p.text : ""))
          .join("");
      }
      answer = answer.trim();

      if (!answer) {
        return res.json({ answer: NOT_FOUND_MESSAGE });
      }

      return res.json({ answer });
    } catch (error) {
      console.error("QUESTION ERROR:", error?.message || error);
      return res.status(500).json({ error: "Unable to answer right now. Please try again." });
    }
  });

  app.use((req, res) => res.status(404).json({ error: "Not found." }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.message === "Origin not allowed by CORS") {
      return res.status(403).json({ error: "Origin not allowed." });
    }
    if (err?.type === "entity.too.large") {
      return res.status(413).json({ error: "Request too large." });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "Invalid JSON." });
    }
    console.error("UNHANDLED ERROR:", err);
    return res.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}
