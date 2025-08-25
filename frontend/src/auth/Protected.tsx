import { useEffect, useState } from "react";
import { fetchAuthSession, signInWithRedirect } from "aws-amplify/auth";

export default function Protected({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession();           // will be empty if not signed in
        if (s.tokens?.idToken) setStatus("ok");
        else await signInWithRedirect();              // kicks to Cognito Hosted UI
      } catch {
        await signInWithRedirect();
      }
    })();
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="animate-spin h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent inline-block" />
          <span>Checking your session…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}