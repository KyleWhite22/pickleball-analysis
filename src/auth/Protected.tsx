import { useEffect, useState } from "react";
import { fetchAuthSession, signInWithRedirect } from "aws-amplify/auth";

export default function Protected({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        if (!session.tokens?.accessToken) {
          await signInWithRedirect();
        } else {
          setOk(true);
        }
      } catch (err) {
        console.error("Auth error:", err);
        await signInWithRedirect();
      }
    })();
  }, []);

  return ok ? <>{children}</> : null;
}
