import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";

const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
const domain = rawDomain ? rawDomain.replace(/^https?:\/\//, "") : "";
const poolId  = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined;

if (!domain || !poolId || !clientId) {
  console.error("Amplify Auth env missing", { domain, poolId, clientId });
  throw new Error("Missing Cognito env. Ensure VITE_* vars are set for this build.");
}

const oauth = {
  domain,                                // e.g. us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com
  scopes: ["openid", "email", "profile"],
  redirectSignIn: [origin],              // must be in Cognito Callback URLs
  redirectSignOut: [origin],             // must be in Cognito Sign-out URLs
  responseType: "code",
} as const;

Amplify.configure({
  Auth: ({
    // v6 shape (Cognito nested)
    Cognito: ({
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: { email: true },
      oauth,
    } as any),
    // also set at top-level for older internal checks
    oauth,
  } as any),
});

// Optional: quick sanity check in console
;(window as any).__amplifyEnv = { domain, poolId, clientId, origin };
/* NEED TO FIX OAUTH AND SHOULD .env.produciton value literally be <> or should i fill in?*/