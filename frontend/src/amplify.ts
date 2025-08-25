import { Amplify } from "aws-amplify";

const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID!;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID!;
const domain   = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/^https?:\/\//, "");

const redirectSignIn  = [
  "https://pickle.kyle-white.com/auth/callback",
  "http://localhost:5173/auth/callback",
];
const redirectSignOut = [
  "https://pickle.kyle-white.com/",
  "http://localhost:5173/",
];

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: {
        email: true,
        oauth: {
          domain,                          // e.g. us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com
          scopes: ["openid", "email", "profile"],
          redirectSignIn,
          redirectSignOut,
          responseType: "code",
        },
      },
    },
  },
});

// simple runtime sanity check
if (typeof window !== "undefined") {
  (window as any).__amplify = Amplify.getConfig();
  console.log("Amplify oauth =",
    (window as any).__amplify?.Auth?.Cognito?.loginWith?.oauth);
}