import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { EmptyState } from '../components/EmptyState';
import { AuthProfilePage } from '../features/auth/AuthProfilePage';
import { CallbackPage } from '../features/auth/CallbackPage';
import { LoginPage } from '../features/auth/LoginPage';
import { CreditsPage } from '../features/credits/CreditsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { PlaygroundPage } from '../features/playground/PlaygroundPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SyncPage } from '../features/sync/SyncPage';
import { consoleUserManager, isActiveUser } from '../lib/auth/console-oidc';
import { hasRequiredAdminRole } from '../lib/auth/auth-roles';
import { AppShell } from '../layout/AppShell';

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <EmptyState
      title="页面不存在"
      description="请从左侧导航进入控制面板功能页。"
    />
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: LoginPage,
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: CallbackPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ location }) => {
    const user = await consoleUserManager.getUser();
    if (!isActiveUser(user)) {
      throw redirect({
        to: '/auth/login',
        search: { returnUrl: location.href },
      });
    }

    if (!hasRequiredAdminRole(user)) {
      throw redirect({ to: '/auth/forbidden' });
    }
  },
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: DashboardPage,
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/profile',
  component: ProfilePage,
});

const syncRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/sync',
  component: SyncPage,
});

const playgroundRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/playground',
  component: PlaygroundPage,
});

const creditsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/credits',
  component: CreditsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsPage,
});

const authProfileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/auth/profile',
  component: AuthProfilePage,
});

const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forbidden',
  component: () => (
    <EmptyState
      title="无管理员权限"
      description="当前账号已登录，但缺少访问星图管理员控制台所需的角色。"
    />
  ),
});

const legacyHomeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: () => <Navigate to="/" />,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  callbackRoute,
  forbiddenRoute,
  appRoute.addChildren([
    indexRoute,
    profileRoute,
    syncRoute,
    playgroundRoute,
    creditsRoute,
    settingsRoute,
    authProfileRoute,
    legacyHomeRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
