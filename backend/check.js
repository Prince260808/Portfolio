// Run with: npm run check
// Tests each external service separately so you can see exactly which one fails.
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { ChatGroq } from "@langchain/groq";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { describeError, normalizeUrl } from "./diagnose.js";
import { connectQdrant } from "./qdrantConnect.js";

let failed = false;
async function step(name, fn) {
  try {
    const info = await fn();
    console.log(`OK    ${name}${info ? ` - ${info}` : ""}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL  ${name}: ${describeError(error, name)}`);
  }
}

const env = (k) => (process.env[k] || "").trim().replace(/^["']|["']$/g, "");

for (const key of ["GROQ_API_KEY", "GOOGLE_API_KEY"]) {
  if (env(key)) console.log(`OK    ${key} is set`);
  else {
    failed = true;
    console.log(`FAIL  ${key} is missing in backend/.env`);
  }
}

const qdrantUrl = normalizeUrl(process.env.QDRANT_URL);
if (!qdrantUrl) {
  console.log("INFO  QDRANT_URL not set: the backend will use its built-in in-memory vector index (no Qdrant needed).");
} else {
  try {
    const client = await connectQdrant({ url: qdrantUrl, apiKey: env("QDRANT_API_KEY") });
    const { collections } = await client.getCollections();
    console.log(`OK    Qdrant - connected, ${collections.length} collection(s)`);
  } catch (error) {
    console.log(`WARN  Qdrant unreachable (not fatal): ${describeError(error, "Qdrant")}`);
    console.log("      The backend will automatically use its in-memory vector index instead.");
    console.log("      To silence this, remove QDRANT_URL from .env or set VECTOR_STORE=memory.");
  }
}

if (env("GOOGLE_API_KEY")) {
  await step("Google embeddings", async () => {
    const e = new GoogleGenerativeAIEmbeddings({ apiKey: env("GOOGLE_API_KEY"), model: "gemini-embedding-001" });
    const docs = await e.embedDocuments(["test one", "test two"]);
    if (!docs.every((d) => Array.isArray(d) && d.length > 0)) {
      throw new Error("embedding API returned empty vectors (check GOOGLE_API_KEY, quota and network)");
    }
    const v = await e.embedQuery("test");
    return `vector size ${v.length}`;
  });
}

if (env("GROQ_API_KEY")) {
  await step("Groq LLM", async () => {
    const llm = new ChatGroq({ apiKey: env("GROQ_API_KEY"), model: process.env.LLM_MODEL || "openai/gpt-oss-120b", temperature: 0 });
    const r = await llm.invoke([{ role: "user", content: "Reply with the single word OK." }]);
    return `replied: ${String(r.content).slice(0, 30)}`;
  });
}

console.log(failed ? "\nSome checks FAILED. Fix those first, then run npm run dev." : "\nAll checks passed. Run npm run dev.");
process.exit(failed ? 1 : 0);
