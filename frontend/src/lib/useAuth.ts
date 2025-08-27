import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

export function useAuth() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession();
        const id: any = s.tokens?.idToken?.payload;
        const ok = !!s.tokens?.idToken;
        setSignedIn(ok);
        setEmail(ok ? (id?.email ?? null) : null);
      } catch {
        setSignedIn(false);
        setEmail(null);
      }
    })();
  }, []);

  return { signedIn, email };
}