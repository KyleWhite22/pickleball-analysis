import { Outlet, NavLink } from "react-router-dom";
import { signOut } from "aws-amplify/auth";

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="font-bold text-xl">🏓 Pickle</div>
        <nav className="space-x-4">
          <NavLink to="/" className="hover:underline">Home</NavLink>
          <NavLink to="/matches/new" className="hover:underline">Log Match</NavLink>
          <NavLink to="/metrics" className="hover:underline">Metrics</NavLink>
        </nav>
        <button
          onClick={() => signOut()}
          className="text-sm text-red-600 hover:underline"
        >
          Sign Out
        </button>
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