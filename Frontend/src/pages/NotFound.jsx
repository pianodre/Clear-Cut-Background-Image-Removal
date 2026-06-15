import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stage px-4 text-center">
      <p className="text-hero text-7xl font-black uppercase tracking-tight text-white sm:text-9xl">
        404
      </p>
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-ink-300">
        This page got cut out
      </p>
      <Link to="/" className="btn-ghost mt-10 px-7 py-3.5">
        Back home
      </Link>
    </div>
  );
}
