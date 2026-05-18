export const OIDC_LOGIN_CHANNEL_NAME = 'aitu:oidc-login';
export const OIDC_LOGIN_COMPLETE_MESSAGE_TYPE = 'aitu:oidc-login-complete';
export const OIDC_LOGIN_MESSAGE_SOURCE = 'xingtu-auth';
export const OIDC_POPUP_LOGIN_SESSION_KEY = 'aitu:oidc-popup-login';

export type OidcLoginCompleteMessage =
  | {
      source: typeof OIDC_LOGIN_MESSAGE_SOURCE;
      type: typeof OIDC_LOGIN_COMPLETE_MESSAGE_TYPE;
      ok: true;
      storageValue: string;
    }
  | {
      source: typeof OIDC_LOGIN_MESSAGE_SOURCE;
      type: typeof OIDC_LOGIN_COMPLETE_MESSAGE_TYPE;
      ok: false;
      error: string;
    };

export function publishOidcLoginCompleteMessage(
  message: OidcLoginCompleteMessage
): void {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(OIDC_LOGIN_CHANNEL_NAME);
      channel.postMessage(message);
      channel.close();
    } catch (error) {
      console.debug('[auth] Failed to broadcast login result:', error);
    }
  }

  try {
    window.opener?.postMessage(message, window.location.origin);
  } catch (error) {
    console.debug('[auth] Failed to post login result to opener:', error);
  }
}
