import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Reveal from "../components/Reveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Stat({ label, value }) {
  return (
    <div className="card p-6">
      <p className="text-[0.7rem] uppercase tracking-widest text-ink-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-16 lg:px-10">
        <Reveal as="p" className="text-[0.7rem] uppercase tracking-widest text-ink-400">Dashboard</Reveal>
        <Reveal as="h1" delay={80} className="mt-2 text-4xl font-extrabold uppercase tracking-tight text-white">
          Welcome back, {user?.name}
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <Reveal delay={0}><Stat label="Plan" value={user?.plan ?? "—"} /></Reveal>
          <Reveal delay={120}><Stat label="Credits left" value={user?.credits ?? 0} /></Reveal>
          <Reveal delay={240}><Stat label="Images this month" value={0} /></Reveal>
        </div>

        <Reveal className="card mt-8 flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-white">
              Ready to cut?
            </h2>
            <p className="mt-2 text-sm text-ink-300">
              Drop in an image and get a transparent PNG back in seconds.
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
          <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-16 text-center">
            <p className="text-sm text-ink-400">No jobs yet.</p>
            <Link to="/app" className="btn-ghost mt-5 px-6 py-3">
              Cut your first image
            </Link>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
