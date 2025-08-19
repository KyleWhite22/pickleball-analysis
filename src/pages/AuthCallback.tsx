import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function AuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession(); // completes code→tokens
        nav(s.tokens?.accessToken ? '/' : '/login', { replace: true });
      } catch (e) {
        console.error('Auth callback failed', e);
        nav('/login', { replace: true });
      }
    })();
  }, [nav]);
  return <div style={{ padding: 24 }}>Processing login…</div>;
}