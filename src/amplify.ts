import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:        import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId:  import.meta.env.VITE_USER_POOL_CLIENT_ID,
      // identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID, // optional
      loginWith: {
        oauth: {
          domain:           import.meta.env.VITE_COGNITO_DOMAIN, // e.g. https://your-domain.auth.us-east-2.amazoncognito.com
          scopes: ['openid','email','profile'],
          redirectSignIn:  [ 'https://pickle.kyle-white.com/auth/callback' ],
          redirectSignOut: [ 'https://pickle.kyle-white.com/' ],
          responseType: 'code', // PKCE
        }
      }
    }
  }
});