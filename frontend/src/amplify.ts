// src/amplify.ts
import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";

const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID!;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID!;
const domain = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/^https?:\/\//, "");

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: poolId,
      userPoolClientId: clientId,
      // 👇 oauth MUST be inside loginWith
      loginWith: {
        email: true,
        oauth: {
          domain, // e.g. us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [`${origin}/auth/callback`],
          redirectSignOut: [origin],
          responseType: "code",
        },
      },
    },
  },
});

// (optional) quick sanity check in the console
if (typeof window !== "undefined") {
  (window as any).__amplifyCfg = Amplify.getConfig();
  console.log(
    "[amplify] oauth configured?",
    !!(window as any).__amplifyCfg?.Auth?.Cognito?.loginWith?.oauth
  );
}