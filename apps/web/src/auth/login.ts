import { ferriskeyUserManager, isActiveUser } from './ferriskey-oidc';
import { getErrorMessage, setHidden, setText } from './auth-ui';

async function login(): Promise<void> {
  try {
    setText('auth-status', '正在检查当前登录状态...');
    await ferriskeyUserManager.clearStaleState();

    const user = await ferriskeyUserManager.getUser();
    if (isActiveUser(user)) {
      window.location.replace('/auth-user.html');
      return;
    }

    setText('auth-status', '正在跳转到 Trust 登录页...');
    await ferriskeyUserManager.signinRedirect({
      state: { returnUrl: '/auth-user.html' },
    });
  } catch (error) {
    setText('auth-status', '登录初始化失败');
    setText('auth-error', getErrorMessage(error));
    setHidden('auth-error', false);
    setHidden('auth-actions', false);
  }
}

void login();
