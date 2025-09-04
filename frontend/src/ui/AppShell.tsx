import { useEffect, useState, useCallback } from "react";
import { Outlet, Link } from "react-router-dom";
import { fetchAuthSession, signOut, signInWithRedirect } from "aws-amplify/auth";
import { useSelectedLeague } from "../state/SelectedLeagueProvider";
import { useMetricsOptional } from "../components/metrics/MetricsProvider";

export default function AppShell() {
  const [email, setEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Selected league + optional metrics (since AppShell sits outside MetricsProvider)
  const { setSelectedLeagueId } = useSelectedLeague();
  const metrics = useMetricsOptional(); // may be null outside <MetricsProvider />

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
    } catch {
      try { await signOut({ global: false }); } catch {}
    } finally {
      // Clear selected league immediately so UI doesn’t show stale data
      setSelectedLeagueId(null);
      localStorage.removeItem("selectedLeagueId");
      localStorage.removeItem("selectedLeagueMeta");
      try { window.history.replaceState(null, "", location.pathname); } catch {}

      // If a MetricsProvider exists on this route, force it to clear
      await metrics?.refresh?.();

      setAuthBusy(false);
      window.location.href = "/";
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
          <div className="flex items-center justify-between py-3">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/pickleballLogo.png"
                alt="Pickleball paddle"
                className="h-12 w-12 md:h-14 md:w-14 object-contain drop-shadow-[0_2px_8px_rgba(249,115,22,0.35)]"
              />
              <div className="leading-tight">
                <div className="text-xl md:text-2xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-mint to-skyish bg-clip-text text-transparent">
                    Pickleball Analysis
                  </span>
                </div>
              </div>
            </Link>

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
                  className="rounded-xl px-3 py-1.5 text-sm font-semibold text-black bg-mint hover:brightness-95 active:brightness-90 transition shadow-sm disabled:opacity-60"
                >
                  {authBusy ? "…" : "Sign in"}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative mx-auto max-w-6xl px-4 pt-2 md:pt-4 pb-6 md:pb-8">
        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
