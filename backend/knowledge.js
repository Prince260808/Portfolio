// Parses portfolio.pdf text into knowledge-base chunks.
//
// The PDF is generated so that every chunk starts with ONE header line:
//     KB-3.4 | MIXED | AI Automation Platform - Architecture
//     QA-07 | MIXED | Q: How is payment security handled in ZEVOX?
// and every Confirmed Facts Register row starts with "F-nn ".
// We split ONLY on those line-start markers, never on IDs that merely appear
// inside sentences or tables (e.g. "see KB-1.8"), which previously broke chunks.

const HEADER_RE =
  /^(KB-\d+\.\d+|QA-\d+|FAQ-\d+) \| (CONFIRMED|GENERAL|MIXED|INSTRUCTIONS) \| (.*)$/;
const FACT_RE = /^(F-\d+) (.+)$/;
const HEADING_RE =
  /^(?:[1-9]\. [A-Z].*|[1-9]\.[1-9] [A-Z].*|Appendix [AB] - .*)$/;
const FOOTER_RE = /^Prince Gupta . Complete Portfolio Knowledge Base for RAG Page \d+$/;
const FACT_TABLE_HEADER_RE = /^ID Confirmed fact Detail chunk$/;
const PAGE_RE = /^\[\[PAGE (\d+)\]\]$/;

const SECTIONS = {
  1: "Professional Profile",
  2: "Technical Skills",
  3: "AI Automation Platform",
  4: "ZEVOX Tech Store",
  5: "AgentForge AI",
  6: "AI Concepts",
  7: "Technical Interview Q&A",
  8: "Recruiter FAQs",
  9: "RAG Chatbot Instructions",
};

export function getSection(chunkId) {
  if (chunkId.startsWith("F-")) return "Confirmed Facts Register";
  if (chunkId.startsWith("QA-")) return "Technical Interview Q&A";
  if (chunkId.startsWith("FAQ-")) return "Recruiter FAQs";
  const n = Number(chunkId.match(/^KB-(\d+)\./)?.[1]);
  return SECTIONS[n] || "Portfolio Knowledge";
}

export function getProject(chunkId) {
  if (/^KB-3\./.test(chunkId) || /^QA-0[1-5]$/.test(chunkId)) {
    return "AI Automation Platform";
  }
  if (/^KB-4\./.test(chunkId) || /^QA-0[6-8]$/.test(chunkId)) {
    return "ZEVOX Tech Store";
  }
  if (/^KB-5\./.test(chunkId) || /^QA-(09|1[0-2])$/.test(chunkId)) {
    return "AgentForge AI";
  }
  return "General Portfolio Knowledge";
}

/**
 * @param {{pageNumber:number,text:string}[]} pages
 * @returns {{chunkId:string,evidenceType:string,title:string,page:number,content:string}[]}
 */
export function extractKnowledgeChunks(pages) {
  const lines = pages.flatMap((p) => [
    `[[PAGE ${p.pageNumber}]]`,
    ...p.text.replace(/\r/g, "").split("\n"),
  ]);

  const chunks = [];
  let page = 0;
  let current = null;

  const close = () => {
    if (current) {
      current.body = current.body.join("\n").trim();
      // Facts-table rows end with a "Detail chunk" cell (e.g. KB-1.8): drop it.
      if (current.isFact) {
        current.body = current.body.replace(/\s*\bKB-\d+\.\d+\s*$/, "");
      }
      chunks.push(current);
    }
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    const pageMatch = line.match(PAGE_RE);
    if (pageMatch) {
      page = Number(pageMatch[1]);
      continue;
    }
    if (!line || FOOTER_RE.test(line) || FACT_TABLE_HEADER_RE.test(line)) {
      continue;
    }

    if (HEADING_RE.test(line)) {
      close();
      continue;
    }

    const header = line.match(HEADER_RE);
    if (header) {
      close();
      current = {
        chunkId: header[1],
        evidenceType: header[2],
        title: header[3].trim(),
        page,
        body: [],
        isFact: false,
      };
      continue;
    }

    const fact = line.match(FACT_RE);
    if (fact) {
      close();
      current = {
        chunkId: fact[1],
        evidenceType: "CONFIRMED",
        title: "Confirmed fact",
        page,
        // Drop the trailing "Detail chunk" column (e.g. "... KB-1.8").
        body: [fact[2].replace(/\s+KB-\d+\.\d+$/, "")],
        isFact: true,
      };
      continue;
    }

    if (current) {
      current.body.push(line);
    }
  }
  close();

  return chunks
    .filter((c) => !c.chunkId.startsWith("KB-9.")) // developer instructions
    .map((c) => ({
      chunkId: c.chunkId,
      evidenceType: c.evidenceType,
      title: c.title,
      page: c.page,
      isFact: c.isFact,
      content: c.isFact
        ? `${c.chunkId} (confirmed fact): ${c.body}`
        : `${c.chunkId} | ${c.evidenceType} | ${c.title}\n${c.body}`,
    }));
}
