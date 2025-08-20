import { signInWithRedirect } from 'aws-amplify/auth';

export default function Login() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Login</h1>
      <p>If you see this, the router is working.</p>
      <button onClick={() => signInWithRedirect()}>Sign in (Hosted UI)</button>
    </div>
  );
}