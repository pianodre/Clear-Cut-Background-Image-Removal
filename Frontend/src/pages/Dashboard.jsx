import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Reveal from "../components/Reveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchJobs } from "../lib/api.js";

const PLAN_LABELS = { payg: "Pay as you go", studio: "Studio" };

function Stat({ label, value }) {
  return (
    <div className="card p-6">
      <p className="text-[0.7rem] uppercase tracking-widest text-ink-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchJobs()
      .then((data) => active && setJobs(data))
      .catch(() => active && setJobs([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const imagesProcessed = jobs.reduce((sum, j) => sum + (j.successful_count || 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-16 lg:px-10">
        <Reveal as="p" className="text-[0.7rem] uppercase tracking-widest text-ink-400">Dashboard</Reveal>
        <Reveal as="h1" delay={80} className="mt-2 text-4xl font-extrabold uppercase tracking-tight text-white">
          Welcome back, {user?.name}
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <Reveal delay={0}><Stat label="Plan" value={PLAN_LABELS[user?.plan] ?? "—"} /></Reveal>
          <Reveal delay={120}><Stat label="Credits left" value={user?.credits ?? 0} /></Reveal>
          <Reveal delay={240}><Stat label="Images processed" value={imagesProcessed} /></Reveal>
        </div>

        <Reveal className="card mt-8 flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-white">
              Ready to cut?
            </h2>
            <p className="mt-2 text-sm text-ink-300">
              Drop in images and get transparent PNGs back in seconds.
            </p>
          </div>
          <Link to="/app" className="btn-primary px-7 py-3.5">
            Open the tool
          </Link>
        </Reveal>

        <Reveal as="section" className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
            Recent jobs
          </h3>

          {loading ? (
            <p className="mt-4 text-sm text-ink-400">Loading…</p>
          ) : jobs.length === 0 ? (
            <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-16 text-center">
              <p className="text-sm text-ink-400">No jobs yet.</p>
              <Link to="/app" className="btn-ghost mt-5 px-6 py-3">
                Cut your first image
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {jobs.map((job) => (
                <li key={job.id} className="card flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-100">
                      {job.successful_count}/{job.total_images} images
                      {job.failed_count ? ` · ${job.failed_count} failed` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDate(job.created_at)} · {job.upload_mode || "batch"} · {job.credits_charged} credits
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-widest text-ink-400">
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
