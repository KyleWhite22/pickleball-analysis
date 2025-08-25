import { Amplify } from "aws-amplify";

const origin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID!;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID!;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN!; // e.g. us-xyz.auth.us-east-2.amazoncognito.com
const domain = rawDomain.replace(/^https?:\/\//, "");    // ensure it's a bare host

if (!poolId || !clientId || !domain) {
  console.error("Missing Cognito envs", { poolId, clientId, domain: rawDomain });
  throw new Error("Missing Cognito envs");
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: poolId,
      userPoolClientId: clientId,
      // 👇 oauth MUST be nested under loginWith
      loginWith: {
        email: true,
        oauth: {
          domain,                              // no protocol
          scopes: ["openid", "email", "profile"],
          redirectSignIn:  [`${origin}/auth/callback`],
          redirectSignOut: [origin],
          responseType: "code",
        },
      },
    },
  },
});

// Debug helpers in the browser console
// (lets you inspect the config quickly)
;(window as any).__amplify = Amplify;
;(window as any).__amplifyCfg = (Amplify as any)?._config;
console.log("[amplify] configured", { origin, poolId, clientId, domain });