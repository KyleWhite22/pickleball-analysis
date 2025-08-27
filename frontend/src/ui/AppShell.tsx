import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { fetchAuthSession, signOut, signInWithRedirect } from "aws-amplify/auth";

export default function AppShell() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession();
        const id: any = s.tokens?.idToken?.payload;
        setEmail(id?.email ?? null);
      } catch {
        setEmail(null);
      }
    })();
  }, []);

  async function handleSignIn() {
    // go straight to Cognito Hosted UI sign-in
    await signInWithRedirect();
  }

  async function handleSignOut() {
    try {
      // revoke local (and Cognito) session
      await signOut({ global: true });
    } finally {
      // immediately bounce to Hosted UI sign-in
      await signInWithRedirect();
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
                      className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSignIn}
                    className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-95 active:opacity-90 transition shadow-sm"
                  >
                    Sign in
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