# ClearCut — Backend (FastAPI)

Multi-user HTTP API in front of the Photoroom background-removal engine. Ports the
proven engine from `../Test-Version/app.py` and wires it to Supabase (auth, DB,
storage, credits). Batch-first: a request can carry a single image, a folder of
images, or a `.zip`.

## Stack

Python · FastAPI · Supabase (Postgres + Auth + Storage) · Photoroom API.

## Setup

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the values
```

Fill in `.env`:

- `PHOTOROOM_API_KEY` — your Photoroom (Max) key. *(carried over from Test-Version)*
- `SUPABASE_URL` — already set to the ClearCut project.
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, get it from
  Supabase Dashboard → Project Settings → API → `service_role`. Server-only; never
  ship it to the frontend.

## Run

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

Port 8001 (not 8000) because Docker/other tooling commonly holds 8000. The Vite
dev proxy in `../Frontend/vite.config.js` targets 8001 to match.

- Health check: `GET http://localhost:8001/health`
- Interactive docs: `http://localhost:8001/docs`

## API

All `/api/*` routes require a Supabase access token: `Authorization: Bearer <token>`.

| Method | Path                      | Purpose                                                       |
| ------ | ------------------------- | ------------------------------------------------------------ |
| GET    | `/health`                 | Liveness (no auth).                                           |
| GET    | `/api/me`                 | Profile + credit balance + plan.                             |
| POST   | `/api/jobs`               | Upload a batch (`files[]`, optional `mode`, `scale_percent`). Streams NDJSON progress. |
| GET    | `/api/jobs`               | List the user's recent jobs.                                  |
| GET    | `/api/jobs/{id}`          | One job + its per-image rows.                                 |
| GET    | `/api/jobs/{id}/download` | Download all results for a job as a ZIP.                      |

### `POST /api/jobs` progress stream

Responds `200` with `application/x-ndjson`, one JSON object per line:

```
{"type":"start","job_id":"…","total":12}
{"type":"progress","current":1,"total":12,"filename":"a.jpg","status":"success"}
…
{"type":"done","job_id":"…","total":12,"successful":11,"failed":1,"credits_charged":11,"failures":[…]}
```

## How it works

- **Auth** (`app/auth.py`): verifies the Supabase JWT on every `/api/*` call.
- **Normalization** (`app/services/images.py`): flattens single/folder/zip into one
  validated image list. Validates type + size for every file, including each entry
  inside a zip; guards against zip bombs and path traversal.
- **Processing** (`app/services/processor.py`): per image, reserves a credit
  (`deduct_credits` RPC) before calling Photoroom, stores the original and result in
  Supabase Storage, and refunds the credit if the call fails — so a failed image is
  never charged and Photoroom is never called without a paid credit. Runs the batch
  concurrently (`MAX_WORKERS`).
- **Engine** (`app/photoroom.py`): the ported retry/backoff/timeout/scaling logic,
  operating on in-memory bytes.

## Security notes

- The `service_role` key bypasses RLS and lives only in this backend's `.env`.
- Every table has RLS; users can read only their own rows.
- CORS is locked to `ALLOWED_ORIGINS`.
- Upload type/size/count caps and zip guards are enforced server-side.

## Done

- Frontend (`../Frontend`) is wired to these endpoints (real Supabase auth + `/api`).
- Full flow verified locally: sign up → credits → upload (single/folder/zip) → streamed progress → download.

## Not done yet (next)

- Stripe billing (credit packs + Studio subscription) and webhooks.
- Async worker/queue for very large batches that may exceed host request timeouts.
- Storage auto-cleanup (delete originals/results after N days).
- Deploy: backend to a long-request host (Render/Railway/Fly), frontend to Vercel.
