// Turns low-level network errors ("fetch failed") into an actionable message.
export function describeError(error, service = "service") {
  const cause = error?.cause;
  const code = cause?.code || error?.code || "";
  const status = error?.status || error?.response?.status;
  const detail = cause?.message || error?.message || String(error);

  let hint = "";
  if (status === 401 || status === 403) {
    hint = `The ${service} rejected the API key. Check the key in .env (no quotes, no spaces, correct service).`;
  } else if (status === 404) {
    hint = `The ${service} URL or model name was not found. Check the URL / model name.`;
  } else if (status === 429) {
    hint = `The ${service} rate limit or free quota was hit. Wait and retry, or check your quota.`;
  } else if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    hint = `The host name could not be resolved. Check the ${service} URL for typos, and that the cluster still exists (free Qdrant Cloud clusters are suspended/deleted after inactivity). Also check your internet/VPN/DNS.`;
  } else if (code === "ECONNREFUSED") {
    hint = `Connection refused. The ${service} is not running at that address/port, or the port is wrong.`;
  } else if (["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "ECONNRESET"].includes(code)) {
    hint = `Connection timed out. A firewall, VPN, paused cluster or wrong port is blocking ${service}.`;
  } else if (/wrong version number|EPROTO|SSL|certificate/i.test(`${code} ${detail}`)) {
    hint = "http/https mismatch or certificate problem. Use https:// for cloud URLs and http:// for local ones.";
  } else if (/fetch failed/i.test(detail)) {
    hint = `Network request failed before reaching the ${service}. Check the URL and your internet connection.`;
  }

  const parts = [error?.message || String(error)];
  if (code) parts.push(`code=${code}`);
  if (cause?.message && cause.message !== error?.message) parts.push(`cause=${cause.message}`);
  if (status) parts.push(`status=${status}`);
  return hint ? `${parts.join(" | ")}\n   -> ${hint}` : parts.join(" | ");
}

/** Accepts "abc.cloud.qdrant.io:6333", quoted values, trailing slashes, etc. */
export function normalizeUrl(raw) {
  let url = String(raw || "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    url = `${/^(localhost|127\.|0\.0\.0\.0)/.test(url) ? "http" : "https"}://${url}`;
  }
  return url;
}
