import { useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // On this route Cognito redirects back with ?code=...
        // fetchAuthSession() completes the code exchange and stores tokens.
        await fetchAuthSession();
      } catch (err) {
        console.error("OAuth callback error:", err);
      } finally {
        nav("/", { replace: true });
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-screen grid place-items-center text-gray-600">
      <div className="flex items-center gap-3">
        <span className="animate-spin h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent inline-block" />
        <span>Finalizing sign-in…</span>
      </div>
    </div>
  );
}