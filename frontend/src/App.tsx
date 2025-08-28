// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './ui/AppShell';
import Home from './pages/Home';
import LogMatch from './pages/LogMatch';
import Metrics from './pages/Metrics';
import Protected from './auth/Protected';
import AuthCallback from './pages/AuthCallback';
import SignedOut from './pages/SignedOut';

const router = createBrowserRouter([
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/signed-out', element: <SignedOut /> }, // ← add this
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'metrics', element: <Metrics /> },
    ],
  },
  {
    path: '/matches/new',
    element: (
      <Protected>
        <AppShell />
      </Protected>
    ),
    children: [{ index: true, element: <LogMatch /> }],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
