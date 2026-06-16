"""End-to-end smoke test for the ClearCut backend.

Creates a throwaway user, grants credits, uploads real images through the running
API, streams progress, downloads the result ZIP, verifies the DB, then cleans up.

Run with the server already listening (see the runner command). Requires the same
.env the server uses. The Photoroom calls are real and cost a few credits.
"""

import io
import os
import sys
import zipfile

import httpx
from supabase import create_client

API = os.environ.get("API_BASE", "http://127.0.0.1:8011")
# Publishable (anon) key — safe to use client-side; only used here to sign in.
ANON_KEY = "sb_publishable_SCCh_Itxnx0AQ5JpTg8R-Q_6bJczNT_"
SAMPLE_DIR = "/Users/student/Desktop/Work/ClearCut/Test-Version/Sample-Images"
SAMPLES = ["Test-Image-1.jpg", "Test-Image-2.jpg", "Test-Image-3.jpg"]
TEST_EMAIL = "e2e+clearcut@example.com"
TEST_PASSWORD = "Test-Passw0rd!"


def load_env(path: str) -> dict:
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def main() -> int:
    env = load_env(os.path.join(os.path.dirname(__file__), "..", ".env"))
    url = env["SUPABASE_URL"]
    admin = create_client(url, env["SUPABASE_SERVICE_ROLE_KEY"])
    public = create_client(url, ANON_KEY)

    # --- clean any leftover user from a previous run -----------------------
    for u in admin.auth.admin.list_users():
        if getattr(u, "email", None) == TEST_EMAIL:
            admin.auth.admin.delete_user(u.id)

    # --- 1) create + confirm a test user -----------------------------------
    created = admin.auth.admin.create_user(
        {"email": TEST_EMAIL, "password": TEST_PASSWORD, "email_confirm": True}
    )
    user_id = created.user.id
    print(f"[1] created user {user_id}")

    # --- 2) sign in to get an access token ---------------------------------
    session = public.auth.sign_in_with_password({"email": TEST_EMAIL, "password": TEST_PASSWORD})
    token = session.session.access_token
    headers = {"Authorization": f"Bearer {token}"}
    print("[2] signed in, got access token")

    # --- 3) grant credits --------------------------------------------------
    admin.rpc("add_credits", {"p_user_id": user_id, "p_amount": 10, "p_type": "grant"}).execute()
    me = httpx.get(f"{API}/api/me", headers=headers).json()
    print(f"[3] granted credits -> balance={me['credits']}, plan={me['plan']}")

    # --- 4) upload a batch, stream progress --------------------------------
    files = [
        ("files", (name, open(os.path.join(SAMPLE_DIR, name), "rb").read(), "image/jpeg"))
        for name in SAMPLES
    ]
    print(f"[4] uploading {len(files)} images to POST /api/jobs ...")
    job_id = None
    with httpx.stream("POST", f"{API}/api/jobs", headers=headers, files=files, timeout=300) as r:
        if r.status_code != 200:
            print("    UPLOAD FAILED", r.status_code, r.read().decode()[:300]); return 1
        for line in r.iter_lines():
            if line:
                print("    >", line)
                import json
                evt = json.loads(line)
                if evt.get("type") in ("start", "done"):
                    job_id = evt.get("job_id", job_id)

    # --- 5) check balance after --------------------------------------------
    me_after = httpx.get(f"{API}/api/me", headers=headers).json()
    print(f"[5] balance after = {me_after['credits']} (was {me['credits']})")

    # --- 6) job detail from DB ---------------------------------------------
    detail = httpx.get(f"{API}/api/jobs/{job_id}", headers=headers).json()
    job = detail["job"]
    print(f"[6] job status={job['status']} success={job['successful_count']} "
          f"failed={job['failed_count']} charged={job['credits_charged']}")
    for img in detail["images"]:
        print(f"      - {img['original_filename']}: {img['status']}"
              + (f" ({img['error']})" if img.get("error") else ""))

    # --- 7) download results ZIP -------------------------------------------
    dl = httpx.get(f"{API}/api/jobs/{job_id}/download", headers=headers, timeout=120)
    ok = False
    if dl.status_code == 200:
        zf = zipfile.ZipFile(io.BytesIO(dl.content))
        names = zf.namelist()
        ok = len(names) == job["successful_count"] and all(n.endswith(".png") for n in names)
        print(f"[7] downloaded ZIP: {len(dl.content)} bytes, {len(names)} PNGs -> {names}")
    else:
        print(f"[7] download status {dl.status_code}")

    # --- 8) ledger ---------------------------------------------------------
    ledger = admin.table("credit_transactions").select("amount, type").eq("user_id", user_id).execute()
    print(f"[8] ledger entries: {ledger.data}")

    # --- 9) cleanup --------------------------------------------------------
    for bucket in ("uploads", "results"):
        try:
            folder = f"{user_id}/{job_id}"
            items = admin.storage.from_(bucket).list(folder)
            paths = [f"{folder}/{it['name']}" for it in items]
            if paths:
                admin.storage.from_(bucket).remove(paths)
        except Exception as exc:  # noqa: BLE001
            print(f"    cleanup {bucket}: {exc}")
    admin.auth.admin.delete_user(user_id)
    print("[9] cleaned up storage + deleted test user")

    success = (
        job["status"] == "completed"
        and job["successful_count"] == len(SAMPLES)
        and me_after["credits"] == me["credits"] - len(SAMPLES)
        and ok
    )
    print("\nRESULT:", "PASS ✅" if success else "FAIL ❌")
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
