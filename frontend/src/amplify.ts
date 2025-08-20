import { Amplify } from 'aws-amplify';

const origin = typeof window !== 'undefined' ? window.location.origin : '';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_wvWmECk8W',            
      userPoolClientId: '5srl4gktjb9bvkm3np3n32c1ld',
      loginWith: {
        oauth: {
          domain: 'us-east-2wvwmeck8w.auth.us-east-2.amazoncognito.com',
          scopes: ['openid','email','profile'],
          redirectSignIn:  [ `${origin}/auth/callback` ],
          redirectSignOut: [ `${origin}/` ],
          responseType: 'code',
        }
      }
    }
  }
});