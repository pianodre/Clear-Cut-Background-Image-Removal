import { Link } from "react-router-dom";

/**
 * Stacked monogram wordmark — two tight uppercase lines, like the references.
 * Working brand name: ClearCut.
 */
export default function Logo({ to = "/", className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex flex-col font-extrabold uppercase leading-[0.82] tracking-tight ${className}`}
    >
      <span className="text-[0.95rem] text-white">Clear</span>
      <span className="text-[0.95rem] text-ink-400">Cut</span>
    </Link>
  );
}
