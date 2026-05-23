import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'oidc-client-ts';
import {
  consoleUserManager,
  getSafeLocalReturnUrl,
  isActiveUser,
} from './console-oidc';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const nextUser = await consoleUserManager.getUser();
    setUser(isActiveUser(nextUser) ? nextUser : null);
    return nextUser;
  }, []);

  useEffect(() => {
    let mounted = true;

    consoleUserManager.getUser().then((nextUser) => {
      if (!mounted) return;
      setUser(isActiveUser(nextUser) ? nextUser : null);
      setIsLoading(false);
    }).catch((error) => {
      console.debug('Failed to load OIDC user', error);
      if (mounted) setIsLoading(false);
    });

    const handleUserLoaded = (loadedUser: User) => setUser(loadedUser);
    const handleUserUnloaded = () => setUser(null);

    consoleUserManager.events.addUserLoaded(handleUserLoaded);
    consoleUserManager.events.addUserUnloaded(handleUserUnloaded);
    consoleUserManager.events.addAccessTokenExpired(handleUserUnloaded);

    return () => {
      mounted = false;
      consoleUserManager.events.removeUserLoaded(handleUserLoaded);
      consoleUserManager.events.removeUserUnloaded(handleUserUnloaded);
      consoleUserManager.events.removeAccessTokenExpired(handleUserUnloaded);
    };
  }, []);

  const login = useCallback(async (returnUrl?: string) => {
    await consoleUserManager.clearStaleState();
    await consoleUserManager.signinRedirect({
      state: { returnUrl: getSafeLocalReturnUrl(returnUrl || window.location.pathname) },
    });
  }, []);

  const logout = useCallback(async () => {
    await consoleUserManager.removeUser();
    setUser(null);
    window.location.assign('/auth/login');
  }, []);

  const getAccessToken = useCallback(async () => {
    const currentUser = await consoleUserManager.getUser();
    return isActiveUser(currentUser) ? currentUser.access_token : null;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: isActiveUser(user),
    login,
    logout,
    refreshUser,
    getAccessToken,
  }), [getAccessToken, isLoading, login, logout, refreshUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
