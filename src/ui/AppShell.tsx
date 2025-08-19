import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { fetchAuthSession, signOut } from "aws-amplify/auth";

export default function AppShell() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession();
        const id = s.tokens?.idToken?.payload as any;
        setEmail(id?.email ?? null);
      } catch {
        setEmail(null);
      }
    })();
  }, []);

  async function handleSignOut() {
    try {
      await signOut();               // clears local session + calls hosted sign-out
    } finally {
      window.location.href = "/";    // ensure we land on a valid path afterwards
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="font-bold text-xl">🏓 Pickle</div>
        <nav className="space-x-4">
          <NavLink to="/" className="hover:underline">Home</NavLink>
          <NavLink to="/matches/new" className="hover:underline">Log Match</NavLink>
          <NavLink to="/metrics" className="hover:underline">Metrics</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {email && <span className="text-sm opacity-75">{email}</span>}
          <button onClick={handleSignOut} className="text-sm text-red-600 hover:underline">
            Sign Out
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <footer className="bg-gray-200 text-center text-sm p-2">
        © {new Date().getFullYear()} Pickle Stats
      </footer>
    </div>
  );
}