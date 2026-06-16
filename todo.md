# ClearCut — Build Plan / TODO

Turning ClearCut from a styled frontend + local prototype into a real, hosted, multi-user SaaS.

**Status (2026-06-16):** Backend (FastAPI), Supabase (DB/Auth/Storage), and the wired frontend all **working end-to-end locally**. Real flow runs: sign up → credits → upload (single/folder/zip) → streamed progress → download. **Remaining: billing (Stripe), hosting/deploy, and hardening.**

**Where we are now**
- `Frontend/` — React + Vite + Tailwind UI, **wired to the real backend** (Supabase auth + real `/api`).
- `Backend/` — **FastAPI** API: auth, batch jobs (single/folder/zip), NDJSON progress, credits, Supabase Storage. Runs on **port 8001**. See `Backend/README.md`.
- `Test-Version/` — the original local Flask prototype; the proven Photoroom engine, already ported into `Backend/`. Kept for reference.

**The core shift (done):** `Test-Version` read/wrote *local folders* for *one user*; the backend is now an *HTTP API* taking *uploaded batches* from *many authenticated, paying users*.

---

## Phase 0 — Decisions & accounts (mostly done)

- [x] **Pricing model** locked: **both** — pay-per-image credits *and* the Studio subscription. No free tier.
- [x] **Backend stack** decided: **Python + FastAPI** (the Photoroom engine was ported into `Backend/`).
- [x] **Supabase** project created (`ClearCut`, ref `pcpmbdxfquimdddjyvuq`, free tier).
- [ ] Confirm **Photoroom Max** rate limits + **per-image cost** (have a Max key; need the limits/margins). Caps concurrency (`MAX_WORKERS`).
- [ ] Create remaining accounts: **Stripe**, a **backend host** (Render/Railway/Fly), **Vercel** (frontend), **domain** (clearcut.app?).

## Phase 1 — Backend API (DONE ✅)

- [x] `Backend/` (FastAPI). Photoroom engine ported to `app/photoroom.py` (retries/backoff/timeout/scaling/HEIC, on in-memory bytes).
- [x] HTTP model:
  - [x] `POST /api/jobs` — multipart batch upload; creates a job + per-image rows; stores originals in Storage.
  - [x] All three upload modes — single / folder / **.zip** (unzipped server-side, supported images only) — normalized into **one** pipeline (`app/services/images.py`).
  - [x] Concurrent processing via `ThreadPoolExecutor` (`MAX_WORKERS`, default 2).
  - [x] Progress streamed as **NDJSON**; `GET /api/jobs/:id` for status + per-image signed result URLs.
  - [x] `GET /api/jobs/:id/download` — results as a **ZIP**.
- [x] Retry/backoff/timeout kept; **storage uploads** also retry on transient TLS errors (thread-local clients).
- [x] **Security:** server-side type/size/count caps for every mode incl. zip entries (zip-bomb + path-traversal guards); Supabase JWT required on every `/api/*`; CORS locked; keys in env. *(Verified: security advisors clean.)*
- [x] **Credits:** reserve a credit before Photoroom, refund on failure (failed images never charged).

## Phase 2 — Supabase (mostly done)

- [x] **Auth** email/password (email confirmation ON by default; password reset available). Google optional — not added yet.
- [x] Tables: `profiles` (cached `credits` + `plan`), `jobs`, `job_images`, `credit_transactions` (ledger), `subscriptions`.
- [x] **RLS** on every table — users read only their own rows; backend writes via service role.
- [x] **Storage** buckets `uploads` + `results` (private; backend mints signed URLs).
- [x] Schema tracked via Supabase migrations (`01`–`06`).
- [ ] **Auto-cleanup job** — delete uploads/results after N days (privacy + storage cost). *(Not done.)*

## Phase 3 — Billing (there's no free tier, so this gates usage)

- [ ] Stripe **products/prices**: credit packs + the Studio subscription.
- [ ] **Checkout** + **webhook** → add credits / set plan on successful payment.
- [ ] **Customer portal** for managing/cancelling subscription.
- [ ] Enforce: block processing at 0 credits; surface a clear "buy credits" path.

## Phase 4 — Wire the frontend to the real backend (DONE ✅)

- [x] `src/context/AuthContext.jsx` now uses **Supabase Auth** (session restore, login/signup/logout); `ProtectedRoute` waits for session.
- [x] `src/lib/api.js` makes real `/api` calls (multipart upload → NDJSON progress → ZIP download), all Bearer-authed; `src/lib/supabase.js` added.
- [x] **Tool page:** single/folder(`webkitdirectory`)/zip upload, live batch progress, partial-failure handling, per-image download + "download all".
- [x] **Dashboard:** real credits, plan, recent jobs from the DB.
- [x] States: loading / error / empty.
- [ ] "**Buy credits**" CTA + disable actions at 0 credits — deferred to billing (Phase 3).

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
