import {
  ferriskeyUserManager,
  getSafeLocalReturnUrl,
  isActiveUser,
} from './ferriskey-oidc';
import { getErrorMessage, setHidden, setText } from './auth-ui';

const AUTH_RETURN_URL_PARAM = 'returnUrl';

function getRequestedReturnUrl(): string {
  return getSafeLocalReturnUrl(
    new URLSearchParams(window.location.search).get(AUTH_RETURN_URL_PARAM)
  );
}

async function login(): Promise<void> {
  const returnUrl = getRequestedReturnUrl();

  try {
    setText('auth-status', '正在检查当前登录状态...');
    await ferriskeyUserManager.clearStaleState();

    const user = await ferriskeyUserManager.getUser();
    if (isActiveUser(user)) {
      window.location.replace(returnUrl);
      return;
    }

    setText('auth-status', '正在前往安全登录页面...');
    await ferriskeyUserManager.signinRedirect({
      state: { returnUrl },
    });
  } catch (error) {
    setText('auth-status', '登录初始化失败');
    setText('auth-error', getErrorMessage(error));
    setHidden('auth-error', false);
    setHidden('auth-actions', false);
  }
}

void login();
