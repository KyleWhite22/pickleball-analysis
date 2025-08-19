import { signInWithRedirect, fetchAuthSession } from 'aws-amplify/auth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      const s = await fetchAuthSession();
      if (s.tokens?.accessToken) nav('/');
    })();
  }, []);
  return (
    <section className="center">
      <h1>Welcome</h1>
      <p>Sign in to log and track your pickleball matches.</p>
      <button onClick={() => signInWithRedirect()}>Sign in</button>
    </section>
  );
}