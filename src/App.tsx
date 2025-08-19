import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './ui/AppShell';
import Login from './pages/Login';
import Home from './pages/Home';
import LogMatch from './pages/LogMatch';
import Metrics from './pages/Metrics';
import Protected from './auth/Protected';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <Protected><AppShell /></Protected>,
    children: [
      { index: true, element: <Home /> },
      { path: 'matches/new', element: <LogMatch /> },
      { path: 'metrics', element: <Metrics /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}