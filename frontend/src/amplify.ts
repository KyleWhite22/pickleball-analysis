import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";

const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID!;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID!;
const domain   = (import.meta.env.VITE_COGNITO_DOMAIN! as string).replace(/^https?:\/\//, "");

Amplify.configure({
  Auth: {
    Cognito: ({
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: {
        email: true,
        oauth: {
          domain,                                     // e.g. us-east-2xxxx.auth.us-east-2.amazoncognito.com
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [`${origin}/auth/callback`],
          redirectSignOut: [origin],
          responseType: "code",
        },
      },
    } as any),
  },
});

// optional: quick sanity log you can remove later
// @ts-ignore
window.__amplify = Amplify.getConfig();