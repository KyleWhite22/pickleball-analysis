import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";

const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string;
const domain = rawDomain.replace(/^https?:\/\//, ""); // host only

const oauth = {
  domain,                                // e.g. us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com
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
      oauth,                // v6 requires it here
    } as any),
    oauth,                  // also mirror at root for safety
  } as any),
});

// 👇 breadcrumb so you can check it in DevTools
;(window as any).__amplifyCfg = (Amplify as any)._config;
console.log("[amplify] configured", { origin, poolId, clientId, domain });