import { useRef, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Reveal from "../components/Reveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createJob, fetchJob, downloadJobZip, isSupported } from "../lib/api.js";

function isZip(file) {
  return (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Tool() {
  const { user, refreshProfile } = useAuth();
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const idRef = useRef(0);

  // phase: "idle" (building the queue) -> "processing" -> "done" (results)
  const [phase, setPhase] = useState("idle");
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [overall, setOverall] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [downloading, setDownloading] = useState(false);

  /** Accept the three upload modes — a single image, many images / a folder, or
   *  a .zip — by classifying each File. Nothing is processed until the user
   *  hits "Remove backgrounds". */
  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const accepted = [];
    let ignored = 0;

    for (const file of incoming) {
      if (isZip(file)) {
        accepted.push({
          id: ++idRef.current,
          file,
          name: file.name,
          size: file.size,
          kind: "archive",
          status: "queued",
        });
      } else if (isSupported(file)) {
        accepted.push({
          id: ++idRef.current,
          file,
          name: file.name,
          size: file.size,
          kind: "image",
          status: "queued",
          previewUrl: URL.createObjectURL(file),
        });
      } else {
        ignored += 1;
      }
    }

    if (!accepted.length) {
      setNotice("No supported files found. Use JPG, PNG, WebP, HEIC, or a .zip.");
      return;
    }
    setNotice(ignored ? `Added ${accepted.length} file(s) · skipped ${ignored} unsupported.` : "");
    setItems((prev) => [...prev, ...accepted]);
  }

  function startOver() {
    items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setResults([]);
    setSummary(null);
    setJobId(null);
    setNotice("");
    setError("");
    setOverall({ current: 0, total: 0 });
    setPhase("idle");
  }

  async function process() {
    if (!items.length) return;
    setError("");
    setPhase("processing");
    setOverall({ current: 0, total: items.length });
    setItems((prev) => prev.map((it) => ({ ...it, status: "working" })));

    try {
      const done = await createJob(
        items.map((it) => it.file),
        {
          onEvent: (evt) => {
            if (evt.type === "start") {
              setOverall({ current: 0, total: evt.total });
            } else if (evt.type === "progress") {
              setOverall({ current: evt.current, total: evt.total });
              // Reflect live status on the matching image item (by filename).
              setItems((prev) => {
                const idx = prev.findIndex(
                  (it) => it.kind === "image" && it.name === evt.filename && it.status === "working"
                );
                if (idx < 0) return prev;
                const copy = [...prev];
                copy[idx] = { ...copy[idx], status: evt.status === "success" ? "done" : "error" };
                return copy;
              });
            }
          },
        }
      );

      setSummary(done);
      const detail = await fetchJob(done.job_id);
      setResults(detail.images);
      setJobId(done.job_id);
      setPhase("done");
      refreshProfile(); // credits changed
    } catch (err) {
      setError(err.message || "Processing failed.");
      // Roll items back to queued so they're not stuck on "working" and can retry.
      setItems((prev) => prev.map((it) => ({ ...it, status: "queued" })));
      setPhase("idle");
    }
  }

  async function handleDownloadAll() {
    setDownloading(true);
    try {
      await downloadJobZip(jobId);
    } catch (err) {
      setError(err.message || "Could not download results.");
    } finally {
      setDownloading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function onPicked(e) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  const isProcessing = phase === "processing";
  const images = items.filter((i) => i.kind === "image");
  const archives = items.filter((i) => i.kind === "archive");
  const succeeded = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status !== "success");

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 lg:px-10">
        <Reveal as="p" className="text-[0.7rem] uppercase tracking-widest text-ink-400">The tool</Reveal>
        <Reveal as="h1" delay={80} className="mt-2 text-4xl font-extrabold uppercase tracking-tight text-white">
          Remove backgrounds
        </Reveal>
        <Reveal as="p" delay={140} className="mt-3 max-w-xl text-sm leading-relaxed text-ink-300">
          Upload a single image, a whole folder, or a .zip — ClearCut cuts out every photo in the batch.
          You have <span className="font-semibold text-white">{user?.credits ?? 0}</span> credits.
        </Reveal>

        {/* Hidden inputs for the three selection modes. */}
        <input
          ref={filesInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={onPicked}
        />
        <input
          ref={(el) => {
            folderInputRef.current = el;
            if (el) {
              el.setAttribute("webkitdirectory", "");
              el.setAttribute("directory", "");
            }
          }}
          type="file"
          multiple
          className="hidden"
          onChange={onPicked}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          multiple
          className="hidden"
          onChange={onPicked}
        />

        {/* Dropzone + pickers (hidden once results are shown) */}
        {phase !== "done" && (
          <Reveal
            as="div"
            onDragOver={(e) => {
              e.preventDefault();
              if (!isProcessing) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => !isProcessing && onDrop(e)}
            className={`mt-10 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
              dragging ? "border-white bg-ink-900" : "border-ink-700 bg-ink-900/40"
            } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" />
            </svg>
            <p className="mt-5 text-sm uppercase tracking-widest text-ink-200">Drop images or a .zip here</p>
            <p className="mt-2 text-xs text-ink-500">JPG, PNG, WebP, HEIC, or .zip — single, folder, or archive</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => filesInputRef.current?.click()} className="btn-primary px-5 py-2.5" disabled={isProcessing}>
                Browse images
              </button>
              <button onClick={() => folderInputRef.current?.click()} className="btn-ghost px-5 py-2.5" disabled={isProcessing}>
                Select folder
              </button>
              <button onClick={() => zipInputRef.current?.click()} className="btn-ghost px-5 py-2.5" disabled={isProcessing}>
                Upload .zip
              </button>
            </div>
            {notice && <p className="mt-5 text-xs text-ink-400">{notice}</p>}
          </Reveal>
        )}

        {error && <p className="mt-6 text-sm text-rose-400">{error}</p>}

        {/* Queue (idle + processing) */}
        {phase !== "done" && items.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
                Queue — {images.length} image{images.length === 1 ? "" : "s"}
                {archives.length ? ` · ${archives.length} archive${archives.length > 1 ? "s" : ""}` : ""}
              </h2>
              {!isProcessing && (
                <button onClick={startOver} className="text-xs uppercase tracking-widest text-ink-400 transition hover:text-white">
                  Clear all
                </button>
              )}
            </div>

            {isProcessing && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-ink-400">
                  <span>Processing…</span>
                  <span>{overall.current}/{overall.total}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${overall.total ? (overall.current / overall.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <ul className="mt-5 space-y-3">
              {items.map((it) => (
                <li key={it.id} className="card flex items-center gap-4 p-4">
                  <div className="checkerboard grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-700">
                    {it.kind === "archive" ? (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                        <path d="M12 5v3m0 2v2m0 2v2" />
                      </svg>
                    ) : (
                      <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-100">{it.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatSize(it.size)} · {it.kind === "archive" ? "ZIP archive" : "image"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[0.65rem] uppercase tracking-widest text-ink-400">
                      {it.kind === "archive"
                        ? isProcessing ? "Expanding" : "Will expand"
                        : it.status === "done" ? "Done"
                        : it.status === "error" ? <span className="text-rose-400">Failed</span>
                        : it.status === "working" ? "Working…"
                        : "Queued"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={process} className="btn-primary px-7 py-3" disabled={isProcessing}>
                {isProcessing ? "Removing backgrounds…" : `Remove backgrounds (${items.length})`}
              </button>
              {!isProcessing && (
                <button onClick={() => filesInputRef.current?.click()} className="btn-ghost px-5 py-3">
                  Add more
                </button>
              )}
            </div>

            {archives.length > 0 && !isProcessing && (
              <p className="mt-4 text-xs text-ink-500">
                Archives are expanded and processed on the server — every supported image inside is cut.
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {phase === "done" && (
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
                Results — {succeeded.length} done
                {failed.length ? ` · ${failed.length} failed` : ""}
                {summary ? ` · ${summary.credits_charged} credits used` : ""}
              </h2>
              <div className="flex gap-3">
                {succeeded.length > 0 && (
                  <button onClick={handleDownloadAll} className="btn-primary px-5 py-2.5" disabled={downloading}>
                    {downloading ? "Preparing…" : "Download all (ZIP)"}
                  </button>
                )}
                <button onClick={startOver} className="btn-ghost px-5 py-2.5">
                  Start over
                </button>
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((r) => (
                <li key={r.id} className="card overflow-hidden p-3">
                  <div className="checkerboard grid aspect-square w-full place-items-center overflow-hidden rounded-lg border border-ink-700">
                    {r.status === "success" && r.result_url ? (
                      <img src={r.result_url} alt={r.original_filename} className="h-full w-full object-contain" />
                    ) : (
                      <span className="px-2 text-center text-xs text-rose-400">{r.error || "Failed"}</span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs text-ink-200" title={r.original_filename}>
                    {r.original_filename}
                  </p>
                  {r.status === "success" && r.result_url && (
                    <a
                      href={r.result_url}
                      download={`${r.original_filename.replace(/\.[^.]+$/, "")}.png`}
                      className="btn-ghost mt-2 block px-3 py-1.5 text-center text-xs"
                    >
                      Download
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
