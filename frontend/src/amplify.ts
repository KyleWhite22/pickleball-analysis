// src/amplify.ts
import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";
const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string;
const domain = rawDomain.replace(/^https?:\/\//, "");

const oauth = {
  domain,                                // us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com
  scopes: ["openid", "email", "profile"],
  redirectSignIn:  [`${origin}/auth/callback`],
  redirectSignOut: [origin],
  responseType: "code",
} as const;

Amplify.configure({
  Auth: ({
    Cognito: ({
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: { email: true },
      oauth,          // inside Cognito
    } as any),
    oauth,            // and at Auth root for safety
  } as any),
});

// quick runtime check helper
;(window as any).__amplifyCfg = (Amplify as any)._config;
