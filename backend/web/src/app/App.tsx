import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from './providers';
import { router } from '../router/router';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
