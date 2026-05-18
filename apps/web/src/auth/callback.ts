import {
  OIDC_LOGIN_COMPLETE_MESSAGE_TYPE,
  OIDC_LOGIN_MESSAGE_SOURCE,
  OIDC_POPUP_LOGIN_SESSION_KEY,
  publishOidcLoginCompleteMessage,
} from './oidc-login-message';
import { ferriskeyUserManager, getSafeReturnUrl } from './ferriskey-oidc';
import { getErrorMessage, setHidden, setText } from './auth-ui';

function isPopupLoginState(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'loginMode' in state &&
    (state as { loginMode?: unknown }).loginMode === 'popup'
  );
}

function closePopupSoon(): void {
  window.setTimeout(() => {
    window.close();
  }, 800);
}

function publishPopupLoginError(error: unknown): void {
  publishOidcLoginCompleteMessage({
    source: OIDC_LOGIN_MESSAGE_SOURCE,
    type: OIDC_LOGIN_COMPLETE_MESSAGE_TYPE,
    ok: false,
    error: getErrorMessage(error),
  });
}

async function handleCallback(): Promise<void> {
  try {
    setText('auth-status', '正在校验 Trust 登录结果...');
    const user = await ferriskeyUserManager.signinRedirectCallback();

    if (isPopupLoginState(user.state)) {
      window.sessionStorage.removeItem(OIDC_POPUP_LOGIN_SESSION_KEY);
      publishOidcLoginCompleteMessage({
        source: OIDC_LOGIN_MESSAGE_SOURCE,
        type: OIDC_LOGIN_COMPLETE_MESSAGE_TYPE,
        ok: true,
        storageValue: user.toStorageString(),
      });
      setText('auth-status', '登录成功，正在返回星图画布...');
      closePopupSoon();
      return;
    }

    window.location.replace(getSafeReturnUrl(user.state));
  } catch (error) {
    if (window.sessionStorage.getItem(OIDC_POPUP_LOGIN_SESSION_KEY)) {
      window.sessionStorage.removeItem(OIDC_POPUP_LOGIN_SESSION_KEY);
      publishPopupLoginError(error);
    }
    setText('auth-status', '登录回调处理失败');
    setText('auth-error', getErrorMessage(error));
    setHidden('auth-error', false);
    setHidden('auth-actions', false);
  }
}

void handleCallback();
