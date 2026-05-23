import { useEffect, useState } from 'react';
import { PageError } from '../../components/PageError';
import { PageLoading } from '../../components/PageLoading';
import {
  consoleUserManager,
  getSafeLocalReturnUrl,
  isActiveUser,
} from '../../lib/auth/console-oidc';

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const returnUrl = getSafeLocalReturnUrl(
      new URLSearchParams(window.location.search).get('returnUrl')
    );

    async function login() {
      try {
        await consoleUserManager.clearStaleState();
        const user = await consoleUserManager.getUser();
        if (isActiveUser(user)) {
          window.location.replace(returnUrl);
          return;
        }
        await consoleUserManager.signinRedirect({ state: { returnUrl } });
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : '登录初始化失败');
      }
    }

    void login();
  }, []);

  if (error) {
    return <PageError title="登录初始化失败" message={error} />;
  }

  return <PageLoading text="正在前往 IAM 登录页面..." />;
}
