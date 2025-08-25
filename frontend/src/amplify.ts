// src/amplify.ts
import { Amplify } from "aws-amplify";

const origin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID!;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID!;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN!; // e.g. my-prefix.auth.us-east-2.amazoncognito.com
const domain = rawDomain.replace(/^https?:\/\//, "");    // ensure bare host

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: {
        email: true,
        oauth: {
          domain,                              // <-- must be here
          scopes: ["openid", "email", "profile"],
          redirectSignIn:  [`${origin}/auth/callback`],
          redirectSignOut: [origin],
          responseType: "code",
        },
      },
    },
  },
});

// --- DEBUG + GUARD RAILS ---
const cfg: any = (Amplify as any)?._config;
if (!cfg?.Auth?.Cognito?.loginWith?.oauth?.domain) {
  console.error("[amplify] BAD CONFIG SHAPE", cfg?.Auth?.Cognito);
  throw new Error("Amplify Hosted UI oauth MUST be under Auth.Cognito.loginWith.oauth");
}
;(window as any).__amplifyCfg = cfg;
console.log("[amplify] configured OK", {
  origin,
  poolId: cfg.Auth?.Cognito?.userPoolId,
  clientId: cfg.Auth?.Cognito?.userPoolClientId,
  oauth: cfg.Auth?.Cognito?.loginWith?.oauth,
});
