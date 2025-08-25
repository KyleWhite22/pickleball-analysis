import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";

const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
const domain = rawDomain?.replace(/^https?:\/\//, "") || "";

const oauth = {
  domain,                                // e.g. us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com
  scopes: ["openid", "email", "profile"],
  redirectSignIn:  [`${origin}/auth/callback`],
  redirectSignOut: [origin],
  responseType: "code",
} as const;

Amplify.configure({
  Auth: ({
    // v6 user pool config
    Cognito: ({
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: { email: true },
      oauth,                        // 👈 inside Cognito
    } as any),
    oauth,                          // 👈 and also here for older internal checks
  } as any),
});

// helpful runtime check
;(window as any).__amplifyEnv = { domain, poolId, clientId, origin };