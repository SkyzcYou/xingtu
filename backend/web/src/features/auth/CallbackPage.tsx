import { useEffect, useState } from 'react';
import { PageError } from '../../components/PageError';
import { PageLoading } from '../../components/PageLoading';
import { consoleUserManager, getSafeReturnUrl } from '../../lib/auth/console-oidc';

export function CallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const user = await consoleUserManager.signinRedirectCallback();
        window.location.replace(getSafeReturnUrl(user.state));
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : '登录回调处理失败');
      }
    }

    void handleCallback();
  }, []);

  if (error) {
    return <PageError title="登录回调处理失败" message={error} />;
  }

  return <PageLoading text="正在校验登录结果..." />;
}
