// Run once locally:  npm run build:vectors
// Embeds portfolio.pdf and saves backend/vectors/*.json. Commit that folder so the deployed
// server starts instantly and never has to re-embed (hosts like Render lose their disk on restart).
import "dotenv/config";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GuardedEmbeddings } from "./embeddingsGuard.js";
import { setupPortfolio } from "./indexer.js";

dns.setDefaultResultOrder("ipv4first");
const dir = path.dirname(fileURLToPath(import.meta.url));
const key = (process.env.GOOGLE_API_KEY || "").trim().replace(/^["']|["']$/g, "");
if (!key) {
  console.error("GOOGLE_API_KEY is missing in backend/.env");
  process.exit(1);
}

const embeddings = new GuardedEmbeddings(
  new GoogleGenerativeAIEmbeddings({ apiKey: key, model: "gemini-embedding-001" })
);
const state = { ready: false, vectorStore: null, factChunks: [], status: "x" };
try {
  const r = await setupPortfolio({
    state,
    embeddings,
    pdfPath: path.join(dir, "portfolio.pdf"),
    memoryOnly: true,
    cacheDir: path.join(dir, "vectors"),
  });
  console.log(`\nDone: ${r.documents} vectors saved in backend/vectors/. Commit this folder with your code.`);
  process.exit(0);
} catch (error) {
  console.error("\nFAILED:", error?.message || error);
  process.exit(1);
}
