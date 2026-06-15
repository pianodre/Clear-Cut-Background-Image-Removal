import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import Reveal from "./Reveal.jsx";

/** Centered dark card layout shared by the Login and Signup screens. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stage px-4 py-12">
      {/* Reveal eases the whole screen in on mount, so it doesn't pop in on navigation. */}
      <Reveal className="flex w-full flex-col items-center">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="card w-full max-w-md p-8 sm:p-10">
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-ink-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        {footer && <p className="mt-6 text-sm text-ink-400">{footer}</p>}
        <Link
          to="/"
          className="mt-3 text-[0.7rem] uppercase tracking-widest text-ink-500 transition hover:text-ink-200"
        >
          ← Back home
        </Link>
      </Reveal>
    </div>
  );
}
