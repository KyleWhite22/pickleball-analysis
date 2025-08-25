import { useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      try { await fetchAuthSession(); }  // exchanges ?code=... for tokens
      catch (e) { console.error("OAuth callback error:", e); }
      finally { nav("/", { replace: true }); }
    })();
  }, [nav]);
  return <div className="min-h-screen grid place-items-center">Finalizing sign-in…</div>;
}