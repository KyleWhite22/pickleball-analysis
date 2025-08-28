import { useEffect } from 'react';
import { signInWithRedirect } from 'aws-amplify/auth';

export default function SignedOut() {
  useEffect(() => {
    // optional: short delay to avoid race if you want
    signInWithRedirect();
  }, []);

  return <p className="p-4 text-sm text-gray-600">Redirecting to sign in…</p>;
}