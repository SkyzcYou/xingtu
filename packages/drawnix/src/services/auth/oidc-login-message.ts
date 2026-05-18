export const OIDC_LOGIN_CHANNEL_NAME = 'aitu:oidc-login';
export const OIDC_LOGIN_COMPLETE_MESSAGE_TYPE = 'aitu:oidc-login-complete';
export const OIDC_LOGIN_MESSAGE_SOURCE = 'xingtu-auth';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isOidcLoginCompleteMessage(
  value: unknown
): value is OidcLoginCompleteMessage {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.source !== OIDC_LOGIN_MESSAGE_SOURCE ||
    value.type !== OIDC_LOGIN_COMPLETE_MESSAGE_TYPE ||
    typeof value.ok !== 'boolean'
  ) {
    return false;
  }

  if (value.ok) {
    return typeof value.storageValue === 'string' && value.storageValue.length > 0;
  }

  return typeof value.error === 'string' && value.error.length > 0;
}
