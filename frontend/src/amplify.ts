import { Amplify } from 'aws-amplify';
import cfg from './amplify-outputs';

Amplify.configure(cfg);

// quick sanity check in the browser console later:
(window as any).__amplify = (Amplify as any)?._config;