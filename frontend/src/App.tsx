// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './ui/AppShell';
import Home from './pages/Home';
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
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
