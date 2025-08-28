import type { ResourcesConfig } from 'aws-amplify';

export default {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_wvWmECk8W',
      userPoolClientId: '5srl4gktjb9bvkm3np3n32c1ld',
      loginWith: {
        email: true,
        oauth: {
          domain: 'us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            'http://localhost:5173/auth/callback',
            'https://pickle.kyle-white.com/auth/callback',
          ],
          redirectSignOut: [
            'http://localhost:5173/signed-out',
            'https://pickle.kyle-white.com/signed-out',
          ],
          responseType: 'code',
        },
      },
    },
  },
} satisfies ResourcesConfig;