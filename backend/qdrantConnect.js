import { QdrantClient } from "@qdrant/js-client-rest";
import { describeError, normalizeUrl } from "./diagnose.js";

const isLocal = (host) => /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host);

/**
 * Candidate URLs to try, most likely first. A reset/blocked port 6333 (or an http/https
 * mix-up) is the most common reason Qdrant Cloud is unreachable, so we also try
 * https on the standard port 443.
 */
export function buildCandidates(rawUrl) {
  const base = normalizeUrl(rawUrl);
  if (!base) return [];
  const u = new URL(base);
  const list = [base];

  if (!isLocal(u.hostname)) {
    list.push(`https://${u.hostname}:443`); // standard HTTPS port, rarely blocked
    list.push(`https://${u.hostname}:6333`);
    if (u.protocol === "http:") list.push(`https://${u.hostname}${u.port ? `:${u.port}` : ""}`);
  }
  return [...new Set(list.map((x) => x.replace(/\/+$/, "")))];
}

const clean = (k) => String(k || "").trim().replace(/^["']|["']$/g, "") || undefined;

/**
 * Returns a working QdrantClient, trying each candidate URL.
 * `makeClient` is injectable for tests.
 */
export async function connectQdrant({
  url,
  apiKey,
  makeClient = (opts) => new QdrantClient(opts),
  probeTimeoutMs = 15_000,
  log = console,
}) {
  const key = clean(apiKey);
  const candidates = buildCandidates(url);
  if (!candidates.length) throw new Error("QDRANT_URL is empty.");

  const failures = [];
  for (const candidate of candidates) {
    try {
      const probe = makeClient({ url: candidate, apiKey: key, checkCompatibility: false, timeout: probeTimeoutMs });
      await probe.getCollections();
      if (candidate !== candidates[0]) {
        log.warn(
          `Qdrant: ${candidates[0]} failed, but ${candidate} works. Set QDRANT_URL=${candidate} in .env to skip the fallback.`
        );
      } else {
        log.log(`Qdrant connected: ${new URL(candidate).host}`);
      }
      return makeClient({ url: candidate, apiKey: key, checkCompatibility: false, timeout: 60_000 });
    } catch (error) {
      failures.push(`  - ${candidate}: ${describeError(error, "Qdrant").split("\n")[0]}`);
    }
  }
  throw new Error(`Could not reach Qdrant on any address:\n${failures.join("\n")}\n   -> Check the cluster is running (cloud.qdrant.io), the API key is correct, and that your network/VPN/firewall allows HTTPS to the cluster.`);
}
