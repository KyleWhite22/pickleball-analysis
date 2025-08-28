// src/AppShell.tsx
import { useEffect, useState, useCallback } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { fetchAuthSession, signOut, signInWithRedirect } from "aws-amplify/auth";

export default function AppShell() {
  const [email, setEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const { pathname } = useLocation();

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
    // initial fetch
    refreshEmail();

    // keep header in sync after Hosted UI redirects / tab focus
    const onFocus = () => refreshEmail();
    const onVisibility = () => document.visibilityState === "visible" && refreshEmail();

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
      // Try full Hosted UI sign-out (requires logout URL configured).
      await signOut(); // default: global Hosted UI flow when configured
    } catch (e) {
      // Fallback: local sign-out to avoid 400 from Cognito logout endpoint
      try {
        await signOut({ global: false });
      } catch {
        /* ignore */
      }
    } finally {
      setAuthBusy(false);
      // Refresh header state without relying on redirect
      refreshEmail();
    }
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#0b0b0e] text-white overflow-x-hidden">
      {/* soft background glows to match Home */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-[#112] blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -top-24 right-0 h-[32rem] w-[32rem] rounded-full bg-[#121a2a] blur-3xl opacity-60" />

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between px-5 py-3">
              {/* Brand + Nav */}
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#8ef17d] to-[#7db2ff] text-black font-bold shadow">
                    🏓
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold tracking-tight">Pickle</div>
                    <div className="text-xs text-zinc-400">League stats & matches</div>
                  </div>
                </Link>

                <nav className="hidden sm:flex items-center gap-2 text-sm">
                  <NavLinkItem to="/" current={pathname === "/"}>Home</NavLinkItem>
                  {/* add more routes later */}
                </nav>
              </div>

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
                    className="rounded-xl px-3 py-1.5 text-sm font-medium text-black bg-gradient-to-r from-[#8ef17d] to-[#7db2ff] hover:opacity-95 active:opacity-90 transition shadow-sm disabled:opacity-60"
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

      {/* Footer (optional, minimalist) */}
      <footer className="mx-auto max-w-6xl px-4 pb-6">
        <div className="text-xs text-zinc-500">
          © {new Date().getFullYear()} Pickle • Built by Kyle
        </div>
      </footer>
    </div>
  );
}

function NavLinkItem({
  to,
  current,
  children,
}: {
  to: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={[
        "rounded-lg px-3 py-1.5 transition",
        current
          ? "bg-white/10 text-white"
          : "text-zinc-300 hover:text-white hover:bg-white/5",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
