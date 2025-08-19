import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession(); // completes the exchange
        navigate(s.tokens?.accessToken ? "/" : "/login", { replace: true });
      } catch (e) {
        console.error("Auth callback failed", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-3 text-gray-600">
        <span className="animate-spin h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent inline-block" />
        <span>Finishing sign-in…</span>
      </div>
    </div>
  );
}