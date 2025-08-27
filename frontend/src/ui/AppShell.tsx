import { useEffect, useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
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
    // initial fetch
    refreshEmail();

    // keep header in sync when user returns to tab (after Hosted UI redirects)
    const onFocus = () => refreshEmail();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshEmail]);

  async function handleSignIn() {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      await signInWithRedirect(); // navigates to Cognito Hosted UI
    } finally {
      // no-op; navigation takes over
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      await signOut({ global: true });
    } finally {
      // send them right back to the Hosted UI sign-in page
      await signInWithRedirect();
      setAuthBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-indigo-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow">
                  <span className="text-lg">🏓</span>
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">Pickle</div>
                  <div className="text-xs text-gray-500">League stats & matches</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {email ? (
                  <>
                    <span className="hidden sm:inline text-sm text-gray-600">{email}</span>
                    <button
                      onClick={handleSignOut}
                      disabled={authBusy}
                      className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition disabled:opacity-60"
                    >
                      {authBusy ? "…" : "Sign out"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSignIn}
                    disabled={authBusy}
                    className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-95 active:opacity-90 transition shadow-sm disabled:opacity-60"
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
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-sm p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-6">
        <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md shadow-sm px-5 py-3 text-sm text-gray-600 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Pickle Stats</span>
          <span className="text-xs text-gray-500">Built with love & 🍞</span>
        </div>
      </footer>
    </div>
  );
}