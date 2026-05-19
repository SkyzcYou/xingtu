import { ferriskeyUserManager, getSafeReturnUrl } from './ferriskey-oidc';
import { getErrorMessage, setHidden, setText } from './auth-ui';

async function handleCallback(): Promise<void> {
  try {
    setText('auth-status', '正在校验登录结果...');
    const user = await ferriskeyUserManager.signinRedirectCallback();

    window.location.replace(getSafeReturnUrl(user.state));
  } catch (error) {
    setText('auth-status', '登录回调处理失败');
    setText('auth-error', getErrorMessage(error));
    setHidden('auth-error', false);
    setHidden('auth-actions', false);
  }
}

void handleCallback();
