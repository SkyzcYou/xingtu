import {
  OIDC_LOGIN_COMPLETE_MESSAGE_TYPE,
  OIDC_LOGIN_MESSAGE_SOURCE,
  OIDC_POPUP_LOGIN_SESSION_KEY,
  publishOidcLoginCompleteMessage,
} from './oidc-login-message';
import { ferriskeyUserManager, isActiveUser } from './ferriskey-oidc';
import { getErrorMessage, setHidden, setText } from './auth-ui';

const POPUP_LOGIN_MODE = 'popup';

function isPopupLoginMode(): boolean {
  return new URLSearchParams(window.location.search).get('mode') === POPUP_LOGIN_MODE;
}

function createLoginState(isPopupMode: boolean): {
  returnUrl: string;
  loginMode?: typeof POPUP_LOGIN_MODE;
} {
  if (isPopupMode) {
    return { returnUrl: '/auth-user.html', loginMode: POPUP_LOGIN_MODE };
  }

  return { returnUrl: '/auth-user.html' };
}

function detachOpener(): void {
  try {
    window.opener = null;
  } catch (error) {
    console.debug('[auth-login] Failed to detach popup opener:', error);
  }
}

function closePopupSoon(): void {
  window.setTimeout(() => {
    window.close();
  }, 800);
}

function publishPopupLoginSuccess(storageValue: string): void {
  publishOidcLoginCompleteMessage({
    source: OIDC_LOGIN_MESSAGE_SOURCE,
    type: OIDC_LOGIN_COMPLETE_MESSAGE_TYPE,
    ok: true,
    storageValue,
  });
  setText('auth-status', '登录成功，正在返回星图画布...');
  closePopupSoon();
}

function publishPopupLoginError(error: unknown): void {
  publishOidcLoginCompleteMessage({
    source: OIDC_LOGIN_MESSAGE_SOURCE,
    type: OIDC_LOGIN_COMPLETE_MESSAGE_TYPE,
    ok: false,
    error: getErrorMessage(error),
  });
}

async function login(): Promise<void> {
  const popupMode = isPopupLoginMode();

  try {
    setText('auth-status', '正在检查当前登录状态...');
    await ferriskeyUserManager.clearStaleState();

    const user = await ferriskeyUserManager.getUser();
    if (isActiveUser(user)) {
      if (popupMode) {
        publishPopupLoginSuccess(user.toStorageString());
        return;
      }

      window.location.replace('/auth-user.html');
      return;
    }

    setText('auth-status', '正在跳转到 Trust 登录页...');
    if (popupMode) {
      window.sessionStorage.setItem(OIDC_POPUP_LOGIN_SESSION_KEY, '1');
      detachOpener();
    }

    await ferriskeyUserManager.signinRedirect({
      state: createLoginState(popupMode),
    });
  } catch (error) {
    if (popupMode) {
      publishPopupLoginError(error);
    }
    setText('auth-status', '登录初始化失败');
    setText('auth-error', getErrorMessage(error));
    setHidden('auth-error', false);
    setHidden('auth-actions', false);
  }
}

void login();
