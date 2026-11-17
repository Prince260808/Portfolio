# Prince Gupta - Portfolio RAG Assistant

A chatbot that answers recruiter and interviewer questions about Prince Gupta using
**only** his resume and the knowledge base built from it (`backend/portfolio.pdf`).

- **Frontend:** React 19 + Vite + Tailwind (`frontend/`)
- **Backend:** Express 5, LangChain, Groq (LLM), Google Gemini embeddings, Qdrant (vector DB) (`backend/`)

## How answers stay accurate
1. `portfolio.pdf` is split into chunks on header lines like `KB-3.4 | MIXED | Title`.
2. The whole **Confirmed Facts Register** (`F-nn` rows) is sent with every question; the most
   relevant chunks from Qdrant are added.
3. The system prompt is closed-book: use only that material, separate CONFIRMED facts from GENERAL
   explanations, and use fixed replies when something is not documented or off-topic.
4. Search uses Qdrant when `QDRANT_URL` is set and reachable. **Qdrant is optional**: if it is empty or unreachable the backend automatically uses a built-in in-memory vector index (vectors cached in `backend/.cache`). Vectors are only rebuilt when `portfolio.pdf` changes.

## Run locally
```bash
cd backend
cp .env.example .env        # fill in GROQ_API_KEY and GOOGLE_API_KEY (QDRANT_* optional)
npm install
npm run check               # tests Qdrant, Gemini and Groq separately and says which one fails
npm run build:vectors       # ONE-TIME: embeds portfolio.pdf into backend/vectors/ (commit that folder)
npm run dev                 # http://localhost:5000/health  (ready:true when indexing is done)

cd ../frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

## Tests
`cd backend && npm test` runs offline tests (chunk parsing, link integrity, keyword search, API behaviour). No API keys needed.

## Deploy
- **Backend (Render):** root `backend`, build `npm install`, start `npm start`. Set `GROQ_API_KEY` and `GOOGLE_API_KEY` (plus `QDRANT_*` only if you want Qdrant) and
  `FRONTEND_URL` (your frontend origin, comma-separated if several, no trailing slash).
- **Frontend (Vercel):** root `frontend`, set `VITE_API_URL` to the backend URL.

## Updating the knowledge base
Replace `backend/portfolio.pdf`, run `npm run build:vectors`, commit `backend/vectors/`, and redeploy. Keep the header format
(`ID | CONFIRMED/GENERAL/MIXED/INSTRUCTIONS | Title`) and the `F-nn` facts rows.
`KB-9.x` (instructions) chunks are never indexed.

## Security
Never commit `.env`. If API keys were ever shared (for example inside a zip), rotate them.
