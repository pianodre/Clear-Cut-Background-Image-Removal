import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/** Gate routes that require a signed-in user. Bounces to /login otherwise.
 *  Waits for the initial session check so a refresh doesn't bounce a logged-in
 *  user before their session is restored. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <p className="text-xs uppercase tracking-widest text-ink-400">Loading…</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
