// src/amplify.ts
import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";

const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
// Accept with or without https:// , store as bare host
const domain = rawDomain ? rawDomain.replace(/^https?:\/\//, "") : "";

const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined;

if (!domain || !poolId || !clientId) {
  // If you see this in prod console, your envs weren't provided at build time.
  console.error("Amplify Auth env missing", { domain, poolId, clientId });
  throw new Error("Missing Cognito env. Ensure VITE_* vars are set for the build.");
}

Amplify.configure({
  Auth: {
    // User Pool only; cast to bypass legacy type requiring identityPoolId
    Cognito: ({
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: { email: true },
      oauth: {
        domain,                          // my-domain-prefix.auth.us-east-2.amazoncognito.com
        scopes: ["openid", "email", "profile"],
        redirectSignIn: [origin],        // must be in Cognito App Client Callback URLs
        redirectSignOut: [origin],       // must be in Cognito Sign-out URLs
        responseType: "code",
      },
    } as any),
  },
});

/* NEED TO FIX OAUTH AND SHOULD .env.produciton value literally be <> or should i fill in?*/