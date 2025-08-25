import { Amplify } from "aws-amplify";

const origin = typeof window !== "undefined" ? window.location.origin : "";
const domain =
  (import.meta.env.VITE_COGNITO_DOMAIN as string).replace(/^https?:\/\//, ""); // ensure bare host

Amplify.configure({
  Auth: {
    // ✅ User Pool only config; cast to avoid older typings requiring identityPoolId
    Cognito: ({
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID!,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID!,
      loginWith: { email: true },
      // ✅ Hosted UI config belongs inside Cognito for Amplify v6
      oauth: {
        domain,                               // e.g. myapp-prod.auth.us-east-2.amazoncognito.com
        scopes: ["openid", "email", "profile"],
        redirectSignIn: [origin],             // must be in Cognito "Callback URLs"
        redirectSignOut: [origin],            // must be in Cognito "Sign out URLs"
        responseType: "code",
      },
    } as any),
  },
});
/* NEED TO FIX OAUTH AND SHOULD .env.produciton value literally be <> or should i fill in?*/