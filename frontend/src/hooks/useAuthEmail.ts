import { useCallback, useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

export function useAuthEmail() {
  const [email, setEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchAuthSession();
      const id: any = s.tokens?.idToken?.payload;
      setEmail(id?.email ?? null);
    } catch {
      setEmail(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onVisibility = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { email, refresh, signedIn: !!email };
}
