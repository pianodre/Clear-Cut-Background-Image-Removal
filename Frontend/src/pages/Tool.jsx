import { useRef, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Reveal from "../components/Reveal.jsx";
import { removeBackground, isSupported } from "../lib/api.js";

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
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const idRef = useRef(0);

  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");

  function updateItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function runItem(item) {
    updateItem(item.id, { status: "working", progress: 0 });
    try {
      const { url } = await removeBackground(item.file, {
        onProgress: (p) => updateItem(item.id, { progress: p }),
      });
      updateItem(item.id, { status: "done", progress: 100, resultUrl: url });
    } catch (err) {
      updateItem(item.id, { status: "error", error: err.message || "Failed." });
    }
  }

  /**
   * Accept any of the three upload modes — a single image, many images / a whole
   * folder, or a .zip — by classifying each File. Images are processed here
   * (mock); a .zip is queued as an archive (the server expands + processes it,
   * so the frontend just accepts it).
   */
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
          status: "ready",
          progress: 0,
        });
      } else if (isSupported(file)) {
        accepted.push({
          id: ++idRef.current,
          file,
          name: file.name,
          size: file.size,
          kind: "image",
          status: "queued",
          progress: 0,
          previewUrl: URL.createObjectURL(file),
        });
      } else {
        ignored += 1; // skip non-image, non-zip files (e.g. stray files in a folder)
      }
    }

    if (!accepted.length) {
      setNotice("No supported files found. Use JPG, PNG, WebP, or a .zip.");
      return;
    }
    setNotice(ignored ? `Added ${accepted.length} file(s) · skipped ${ignored} unsupported.` : "");
    setItems((prev) => [...prev, ...accepted]);
    accepted.filter((i) => i.kind === "image").forEach(runItem);
  }

  function clearAll() {
    setItems([]);
    setNotice("");
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function onPicked(e) {
    addFiles(e.target.files);
    e.target.value = ""; // allow re-picking the same selection
  }

  const hasItems = items.length > 0;
  const images = items.filter((i) => i.kind === "image");
  const archives = items.filter((i) => i.kind === "archive");
  const doneCount = images.filter((i) => i.status === "done").length;

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
        </Reveal>

        {/* Hidden inputs for the three selection modes. The folder input needs
            webkitdirectory set imperatively to avoid React unknown-attribute warnings. */}
        <input
          ref={filesInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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

        {/* Dropzone + the three pickers */}
        <Reveal
          as="div"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-10 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragging ? "border-white bg-ink-900" : "border-ink-700 bg-ink-900/40"
          }`}
        >
          <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" />
          </svg>
          <p className="mt-5 text-sm uppercase tracking-widest text-ink-200">Drop images or a .zip here</p>
          <p className="mt-2 text-xs text-ink-500">JPG, PNG, WebP, or .zip — single, folder, or archive</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => filesInputRef.current?.click()} className="btn-primary px-5 py-2.5">
              Browse images
            </button>
            <button onClick={() => folderInputRef.current?.click()} className="btn-ghost px-5 py-2.5">
              Select folder
            </button>
            <button onClick={() => zipInputRef.current?.click()} className="btn-ghost px-5 py-2.5">
              Upload .zip
            </button>
          </div>
          {notice && <p className="mt-5 text-xs text-ink-400">{notice}</p>}
        </Reveal>

        {/* Queue */}
        {hasItems && (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
                Queue — {doneCount}/{images.length} images
                {archives.length ? ` · ${archives.length} archive${archives.length > 1 ? "s" : ""}` : ""}
              </h2>
              <button onClick={clearAll} className="text-xs uppercase tracking-widest text-ink-400 transition hover:text-white">
                Clear all
              </button>
            </div>

            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <li key={it.id} className="card flex items-center gap-4 p-4">
                  <div className="checkerboard grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-700">
                    {it.kind === "archive" ? (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                        <path d="M12 5v3m0 2v2m0 2v2" />
                      </svg>
                    ) : (
                      <img src={it.resultUrl || it.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-100">{it.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatSize(it.size)} · {it.kind === "archive" ? "ZIP archive" : "image"}
                    </p>
                    {it.kind === "image" && it.status === "working" && (
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-700">
                        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${it.progress}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    {it.kind === "archive" ? (
                      <span className="text-[0.65rem] uppercase tracking-widest text-ink-400">Expands on upload</span>
                    ) : it.status === "done" ? (
                      <a
                        href={it.resultUrl}
                        download={`clearcut-${it.name.replace(/\.[^.]+$/, "")}.png`}
                        className="btn-ghost px-4 py-2"
                      >
                        Download
                      </a>
                    ) : it.status === "error" ? (
                      <span className="text-xs text-rose-400">{it.error}</span>
                    ) : (
                      <span className="text-[0.65rem] uppercase tracking-widest text-ink-400">
                        {it.status === "working" ? `${it.progress}%` : "Queued"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => filesInputRef.current?.click()} className="btn-ghost px-5 py-2.5">
                Add more
              </button>
            </div>

            {archives.length > 0 && (
              <p className="mt-4 text-xs text-ink-500">
                Archives are expanded and processed on the server after upload — the preview here just shows them queued.
              </p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
