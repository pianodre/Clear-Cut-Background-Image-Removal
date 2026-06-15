import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800/60 bg-ink-950/70 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Logo to={isAuthenticated ? "/dashboard" : "/"} />

        <nav className="flex items-center gap-6 sm:gap-8">
          {isAuthenticated ? (
            <>
              <Link to="/app" className="nav-link hidden sm:block">
                Tool
              </Link>
              <Link to="/dashboard" className="nav-link hidden sm:block">
                Dashboard
              </Link>
              <span className="hidden text-xs uppercase tracking-widest text-ink-500 md:block">
                {user?.email}
              </span>
              <button onClick={handleLogout} className="btn-ghost px-4 py-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/#features" className="nav-link hidden sm:block">
                Features
              </a>
              <a href="/#pricing" className="nav-link hidden sm:block">
                Pricing
              </a>
              <a href="/#contact" className="nav-link hidden sm:block">
                Contact
              </a>
              <Link to="/login" className="nav-link">
                Log in
              </Link>
              <Link to="/signup" className="btn-ghost px-4 py-2">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
