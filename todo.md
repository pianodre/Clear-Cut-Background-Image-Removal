# ClearCut — Build Plan / TODO

Turning ClearCut from a styled frontend + local prototype into a real, hosted, multi-user SaaS.

**Where we are now**
- `Frontend/` — React + Vite + Tailwind UI is done (mock auth + mock removal API).
- `Test-Version/` — a working local Flask tool that already calls the **Photoroom API**, batch-processes a folder concurrently (retries, backoff, timeouts, HEIC, resize, NDJSON progress, resume checkpoints). This is the proven engine to port — don't rewrite it.

**The core shift:** `Test-Version` reads/writes *local folders* for *one user*. We need an *HTTP API* that takes *uploaded batches* from *many authenticated, paying users*. Built for batches, not one-at-a-time.

---

## Phase 0 — Decisions & accounts (do first, they shape everything)

- [ ] Confirm **Photoroom plan/tier** (Max vs Enterprise), its **rate limits**, and **per-image cost** — this caps our concurrency and margins.
- [ ] Lock the **pricing model**: pay-per-image credits, the $29 Studio subscription, or both. (Drives the billing build.)
- [ ] Decide **backend stack** → recommend **keep Flask** (the engine already works in `Test-Version`).
- [ ] Create accounts/projects: **Supabase**, **Stripe**, a **backend host** (Render/Railway/Fly), **Vercel** (frontend), and the **domain** (clearcut.app?).

## Phase 1 — Backend API (port the proven engine)

- [ ] New `Backend/` folder. Lift the Photoroom logic from `Test-Version/app.py` (`remove_background`, retries/backoff, scaling, HEIC, `ThreadPoolExecutor`).
- [ ] Swap the local-folder model for HTTP:
  - [ ] `POST /api/jobs` — accept a **multipart batch upload**; create a job + per-image rows; store originals in Supabase Storage.
  - [ ] **Handle all three upload modes** the frontend sends:
    - [ ] **Single image** — one file → one-image job.
    - [ ] **Folder / multiple images** — many files in one request (the frontend flattens a folder into a file list); process the whole batch.
    - [ ] **.zip archive** — accept the upload, **unzip server-side**, find the supported images inside (skip junk/nested non-images), and feed them into the same batch pipeline.
  - [ ] Normalize all three into one internal list of images, then run the **same** concurrent pipeline — don't fork the logic per mode.
  - [ ] Process the batch concurrently with **rate limiting** tuned to the Photoroom tier.
  - [ ] Report progress: stream **NDJSON/SSE** (reuse the prototype's progress events) or poll `GET /api/jobs/:id`.
  - [ ] `GET /api/jobs/:id/download` — return all results as a **ZIP**.
- [ ] Keep the retry/backoff/timeout logic (it's already solid).
- [ ] **Security:** validate file type + size server-side **for every mode** (incl. each entry extracted from a zip — guard against zip bombs / path traversal / huge archives), cap batch count + total upload size, require a valid Supabase JWT on every endpoint, lock **CORS** to the frontend origin, keep all keys in env vars.
- [ ] **Credits:** check balance before a job, decrement per successful image, refund/skip on failure.

## Phase 2 — Supabase (Auth + DB + Storage)

- [ ] Enable **Auth**: email/password (+ optional Google). Email verification + password reset.
- [ ] Tables: `profiles` (1:1 with `auth.users`), `credits`/wallet, `jobs`, `job_images`, `transactions`, `subscriptions`.
- [ ] **Row-Level Security** on every table — users see only their own rows; backend uses the service role for writes.
- [ ] **Storage** buckets: `uploads` (originals) + `results` (PNGs).
- [ ] **Auto-cleanup job** — delete uploads/results after N days (these are clients' photos; don't hoard them — privacy + storage cost).
- [ ] Track schema with **Supabase CLI migrations**.

## Phase 3 — Billing (there's no free tier, so this gates usage)

- [ ] Stripe **products/prices**: credit packs + the Studio subscription.
- [ ] **Checkout** + **webhook** → add credits / set plan on successful payment.
- [ ] **Customer portal** for managing/cancelling subscription.
- [ ] Enforce: block processing at 0 credits; surface a clear "buy credits" path.

## Phase 4 — Wire the frontend to the real backend

- [ ] Replace mock `src/context/AuthContext.jsx` with the **Supabase Auth** client (session, login/signup/logout, protected routes).
- [ ] Replace mock `src/lib/api.js` with real `/api` calls (upload batch → progress → download ZIP).
- [ ] **Tool page:** multi-file **and folder** upload (`webkitdirectory`), a per-image progress list, partial-failure handling, "download all".
- [ ] **Dashboard:** real credits, plan, and recent jobs from the DB; a "buy credits" CTA.
- [ ] States: loading / error / empty; disable actions when out of credits.

## Phase 5 — Hosting & deploy

- [ ] **Frontend → Vercel** (build `Frontend/`, set `VITE_*` env, attach the domain).
- [ ] **Backend → Render/Railway/Fly** (a host that allows longer-running requests — note Vercel serverless has short timeouts that batch jobs can exceed). Set env secrets there.
- [ ] Point the frontend at the backend URL; confirm HTTPS, DNS, and locked CORS in production.

## Phase 6 — Hardening & launch

- [ ] **Rate limiting / abuse protection** (per-user + per-IP) to cap Photoroom spend.
- [ ] **Cost alerts** on Photoroom, Supabase, and Stripe.
- [ ] **Error monitoring + logging** (e.g. Sentry).
- [ ] **Privacy policy + Terms of Service** — required since we process clients' photos.
- [ ] A **staging** environment + basic API tests before launch.

---

## Things that are easy to miss (flagged)

- **Billing/Stripe** — without a free tier, payments aren't optional; they gate all usage.
- **Storage lifecycle + privacy** — auto-delete customer photos; don't keep them forever.
- **Async jobs for big batches** — long requests can exceed host timeouts; may need a background worker/queue + polling rather than one long HTTP call.
- **Cost guardrails** — every Photoroom call costs money; rate-limit and alert so a bad actor (or bug) can't run up the bill.
- **Email flows** — verification, password reset, payment receipts.
- **Legal** — ToS + privacy policy for handling third-party images.
- **Heavy uploads** — chunked/resumable uploads + size caps so large batches don't fail mid-transfer.
- **Local note:** renaming the folder breaks `Test-Version/venv` (absolute paths) — recreate it (`python3 -m venv venv`) if you run the old prototype again.
