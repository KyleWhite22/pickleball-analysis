import { Amplify } from "aws-amplify";

// Use exact callback path that’s in Cognito → App client → Managed login pages
const origin =
  typeof window !== "undefined" ? window.location.origin : "";

// Read Vite envs at build time
const poolId   = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined;
const rawDomain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;

// Accept with or without protocol
const domain = rawDomain?.replace(/^https?:\/\//, "");

if (!poolId || !clientId || !domain) {
  console.error("Amplify Auth env missing", { poolId, clientId, domain });
  // Don’t throw in production—let the app render and you can read console output
}

const authConfig: any = {
  Auth: {
    // v6 User Pool-only config
    Cognito: {
      userPoolId: poolId,
      userPoolClientId: clientId,
      loginWith: { email: true },
    },
    // Hosted UI (code grant)
    oauth: {
      domain,                             // e.g. my-prefix.auth.us-east-2.amazoncognito.com
      scopes: ["openid", "email", "profile"],
      redirectSignIn:  [`${origin}/auth/callback`],
      redirectSignOut: [origin],
      responseType: "code",
    },
  },
};

Amplify.configure(authConfig);