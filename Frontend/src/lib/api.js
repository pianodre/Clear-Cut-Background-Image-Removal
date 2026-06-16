/**
 * ClearCut backend client.
 *
 * Talks to the FastAPI backend. Every call carries the Supabase access token as
 * a Bearer header. In dev, requests go to "/api" and Vite proxies them to the
 * backend; in production VITE_API_BASE_URL points at the deployed origin.
 */
import { supabase } from "./supabase.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const SUPPORTED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

/** True if a File is a supported image (by MIME type, or extension when the
 *  browser reports no type — common for HEIC). */
export function isSupported(file) {
  if (SUPPORTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return SUPPORTED_EXTS.some((ext) => name.endsWith(ext));
}

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please log in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function asError(response, fallback) {
  let detail = fallback;
  try {
    const body = await response.json();
    detail = body.detail || fallback;
  } catch {
    /* non-JSON error body */
  }
  return new Error(detail);
}

/** GET /api/me — profile + credits + plan. */
export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/me`, { headers: await authHeaders() });
  if (!res.ok) throw await asError(res, "Could not load your account.");
  return res.json();
}

/** GET /api/jobs — the user's recent jobs. */
export async function fetchJobs() {
  const res = await fetch(`${API_BASE}/api/jobs`, { headers: await authHeaders() });
  if (!res.ok) throw await asError(res, "Could not load your jobs.");
  const { jobs } = await res.json();
  return jobs;
}

/** GET /api/jobs/:id — one job plus its per-image rows (with signed result URLs). */
export async function fetchJob(jobId) {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { headers: await authHeaders() });
  if (!res.ok) throw await asError(res, "Could not load that job.");
  return res.json();
}

/**
 * POST /api/jobs — upload a batch (single image, folder, or .zip) and stream
 * NDJSON progress. `onEvent` is called with each parsed event:
 *   { type: "start", job_id, total }
 *   { type: "progress", current, total, filename, status }
 *   { type: "done", job_id, total, successful, failed, credits_charged, failures }
 * Resolves with the final "done" event.
 */
export async function createJob(files, { scalePercent = 100, onEvent } = {}) {
  const form = new FormData();
  for (const file of files) form.append("files", file, file.name);
  form.append("scale_percent", String(scalePercent));

  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok || !res.body) throw await asError(res, "Upload failed.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = null;

  // Read the NDJSON stream line by line. The loop ends when the stream closes,
  // so it always terminates.
  for (;;) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === "done") done = event;
      onEvent?.(event);
    }
  }
  if (!done) throw new Error("The job ended unexpectedly.");
  return done;
}

/** GET /api/jobs/:id/download — fetch the results ZIP (auth required) and save it. */
export async function downloadJobZip(jobId) {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/download`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw await asError(res, "Could not download results.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clearcut-${jobId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
