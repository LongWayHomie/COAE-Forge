// Thin fetch wrapper around the FastAPI backend (proxied at /api in dev).

const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* keep statusText */
    }
    throw new Error(detail);
  }
  return res.json();
}

export function apiGet(path, params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetch(`${BASE}${path}${qs}`).then(handle);
}

export function apiPost(path, body) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}
