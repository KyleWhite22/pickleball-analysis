// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './ui/AppShell';
import Login from './pages/Login';
import Home from './pages/Home';
import LogMatch from './pages/LogMatch';
import Metrics from './pages/Metrics';
import Protected from './auth/Protected';
import AuthCallback from './pages/AuthCallback';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/auth/callback', element: <AuthCallback /> },

  // PUBLIC app frame + pages
  {
    path: '/',
    element: <AppShell />, // ⟵ no Protected here
    children: [
      { index: true, element: <Home /> },      // public browse (gated create in the component)
      { path: 'metrics', element: <Metrics /> } // keep public if you want
    ],
  },

  // AUTH-REQUIRED routes (only the ones that truly need it)
  {
    path: '/matches/new',
    element: (
      <Protected>
        <AppShell />
      </Protected>
    ),
    children: [
      { index: true, element: <LogMatch /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
