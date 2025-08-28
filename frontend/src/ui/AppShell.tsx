// src/AppShell.tsx
import { useEffect, useState, useCallback } from "react";
import { Outlet, Link } from "react-router-dom";
import { fetchAuthSession, signOut, signInWithRedirect } from "aws-amplify/auth";

export default function AppShell() {
  const [email, setEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const refreshEmail = useCallback(async () => {
    try {
      const s = await fetchAuthSession();
      const id: any = s.tokens?.idToken?.payload;
      setEmail(id?.email ?? null);
    } catch {
      setEmail(null);
    }
  }, []);

  useEffect(() => {
    refreshEmail();

    const onFocus = () => refreshEmail();
    const onVisibility = () =>
      document.visibilityState === "visible" && refreshEmail();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshEmail]);

  async function handleSignIn() {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      await signInWithRedirect();
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
  if (authBusy) return;
  setAuthBusy(true);
  try {
    await signOut({ global: true });
  } catch (e) {
    // fallback to local sign out
    try {
      await signOut({ global: false });
    } catch {
      /* ignore */
    }
  } finally {
    setAuthBusy(false);
    // Clear client-side state
    localStorage.removeItem("leagueId"); // ⬅ remove persisted league
    // Optional: if you have a context/store, clear it here too
    window.location.href = "/"; // ⬅ force redirect to home/landing
  }
}

  return (
    <div className="relative min-h-[100dvh] bg-ink-900 text-white overflow-x-hidden">
      {/* background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-[#112] blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -top-24 right-0 h-[32rem] w-[32rem] rounded-full bg-[#121a2a] blur-3xl opacity-60" />

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between px-5 py-3">
              {/* Brand only (logo + text) */}
              <Link to="/" className="flex items-center gap-3">
                <img
                  src="/logo.png" // 👈 place your logo in /public/logo.png or adjust path
                  alt="Pickle Logo"
                  className="h-9 w-9 rounded-xl shadow object-cover"
                />
                <div className="leading-tight">
                  <div className="font-semibold tracking-tight">Pickle</div>
                  <div className="text-xs text-zinc-400">
                    League stats & matches
                  </div>
                </div>
              </Link>

              {/* Auth */}
              <div className="flex items-center gap-3">
                {email ? (
                  <>
                    <span className="hidden sm:inline text-sm text-zinc-300 truncate max-w-[220px]">
                      {email}
                    </span>
                    <button
                      onClick={handleSignOut}
                      disabled={authBusy}
                      className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 active:bg-black transition disabled:opacity-60"
                    >
                      {authBusy ? "…" : "Sign out"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSignIn}
                    disabled={authBusy}
                    className="rounded-xl px-3 py-1.5 text-sm font-medium text-black bg-gradient-to-r from-mint to-skyish hover:opacity-95 active:opacity-90 transition shadow-sm disabled:opacity-60"
                  >
                    {authBusy ? "…" : "Sign in"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative mx-auto max-w-6xl px-4 py-6 md:py-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,.35)] p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-6">
        <div className="text-xs text-zinc-500">
          © {new Date().getFullYear()} Pickle • Built by Kyle
        </div>
      </footer>
    </div>
  );
}
