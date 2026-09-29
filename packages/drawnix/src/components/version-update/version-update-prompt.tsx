import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { Button, Dialog } from 'tdesign-react';
import { RefreshIcon } from 'tdesign-icons-react';
import { useTaskQueue } from '../../hooks/useTaskQueue';
import { hasActiveLLMTasksSync } from '../../utils/active-tasks';
import {
  getAutoUpdateStatus,
  subscribeAutoUpdateStatus,
  type AutoUpdateStatus,
} from '../../services/auto-update-state';
import './version-update-prompt.scss';

interface UpdateAvailableState {
  version: string;
  changelog?: string[];
}

function parseUpdateAvailableState(
  value: unknown
): UpdateAvailableState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as { version?: unknown; changelog?: unknown };
  if (typeof candidate.version !== 'string') {
    return null;
  }

  if (candidate.changelog === undefined) {
    return { version: candidate.version };
  }

  if (
    Array.isArray(candidate.changelog) &&
    candidate.changelog.every((item) => typeof item === 'string')
  ) {
    return {
      version: candidate.version,
      changelog: candidate.changelog,
    };
  }

  return null;
}

function getPendingUpdateReadyState(): UpdateAvailableState | null {
  return parseUpdateAvailableState(
    (
      window as Window & {
        __AITU_PENDING_UPDATE__?: unknown;
      }
    ).__AITU_PENDING_UPDATE__
  );
}

function VersionUpdatePromptContent({
  updateAvailable,
  automaticUpdate,
}: {
  updateAvailable: UpdateAvailableState;
  automaticUpdate: AutoUpdateStatus | null;
}) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasActiveTasks, setHasActiveTasks] = useState(() =>
    hasActiveLLMTasksSync()
  );
  const { activeTasks } = useTaskQueue();

  useEffect(() => {
    setHasActiveTasks(hasActiveLLMTasksSync());
  }, [activeTasks]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;
    const syncActiveTasks = () => {
      setHasActiveTasks(hasActiveLLMTasksSync());
    };

    void import('../../services/workflow-submission-service')
      .then(({ workflowSubmissionService }) => {
        if (cancelled) {
          return;
        }
        syncActiveTasks();
        subscription =
          workflowSubmissionService.subscribeToAllEvents(syncActiveTasks);
      })
      .catch((error) => {
        console.warn('[VersionUpdatePrompt] Failed to watch workflows:', error);
      });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (
      hasActiveTasks ||
      automaticUpdate?.phase === 'preparing' ||
      automaticUpdate?.phase === 'updating'
    ) {
      return;
    }

    setShowChangelog(false);
    window.dispatchEvent(
      new CustomEvent(
        automaticUpdate ? 'auto-update-now' : 'user-confirmed-upgrade'
      )
    );
  }, [automaticUpdate, hasActiveTasks]);

  const handleShowChangelog = useCallback(() => {
    setShowChangelog(true);
  }, []);

  const handleCloseChangelog = useCallback(() => {
    setShowChangelog(false);
  }, []);

  const switching =
    automaticUpdate?.phase === 'preparing' ||
    automaticUpdate?.phase === 'updating';
  const updateDisabled = hasActiveTasks || switching;
  const updateLabel = switching
    ? '正在更新'
    : hasActiveTasks
    ? '任务运行中'
    : '立即更新';
  const statusText = automaticUpdate
    ? automaticUpdate.phase === 'countdown'
      ? `将在 ${automaticUpdate.remainingSeconds ?? 10} 秒后更新至 v${
          automaticUpdate.version
        }，并恢复当前画板`
      : automaticUpdate.phase === 'preparing'
      ? `正在保存当前工作，准备更新至 v${automaticUpdate.version}`
      : automaticUpdate.phase === 'updating'
      ? `正在更新至 v${automaticUpdate.version}，完成后将恢复当前画板`
      : automaticUpdate.phase === 'blocked'
      ? `新版本 v${automaticUpdate.version} 等待安全更新`
      : `新版本 v${automaticUpdate.version} 已就绪，将在空闲时自动更新`
    : hasActiveTasks
    ? `新版本 v${updateAvailable.version} 已就绪，任务完成后可更新`
    : `新版本 v${updateAvailable.version} 已就绪`;

  return (
    <>
      <div className="version-update-prompt" data-auto-update-ui>
        <div className="version-update-prompt__content">
          <div
            className="version-update-prompt__message"
            role="status"
            aria-live="polite"
          >
            <span className="version-update-prompt__text">{statusText}</span>
            {automaticUpdate?.reason && (
              <span className="version-update-prompt__detail">
                {automaticUpdate.reason}
              </span>
            )}
            {automaticUpdate?.overdue && automaticUpdate.draining !== false && !switching && (
              <span className="version-update-prompt__detail">
                已进入更新窗口，暂不接受新任务；当前任务结束并保存后自动更新
              </span>
            )}
          </div>
          {updateAvailable.changelog &&
            updateAvailable.changelog.length > 0 && (
              <Button
                theme="default"
                variant="text"
                size="small"
                onClick={handleShowChangelog}
              >
                查看更新内容
              </Button>
            )}
          {automaticUpdate?.canPostpone &&
            !automaticUpdate.overdue &&
            !switching && (
              <Button
                theme="default"
                variant="text"
                size="small"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('auto-update-postpone'))
                }
              >
                稍后
              </Button>
            )}
          <Button
            theme="primary"
            size="small"
            onClick={handleUpdate}
            icon={<RefreshIcon />}
            disabled={updateDisabled}
          >
            {updateLabel}
          </Button>
        </div>
      </div>

      <Dialog
        className="version-update-prompt__dialog"
        header={`新版本 v${updateAvailable.version} 更新内容`}
        visible={showChangelog}
        onClose={handleCloseChangelog}
        width={600}
        footer={
          <div data-auto-update-ui>
            <Button
              theme="primary"
              onClick={handleUpdate}
              disabled={updateDisabled}
            >
              {updateLabel}
            </Button>
          </div>
        }
      >
        <div
          data-auto-update-ui
          style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}
        >
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {updateAvailable.changelog?.map((item, index) => (
              <li
                key={index}
                style={{ marginBottom: '4px', lineHeight: '1.5' }}
              >
                {index + 1}. {item}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}

export const VersionUpdatePrompt: React.FC = () => {
  const automaticUpdate = useSyncExternalStore(
    subscribeAutoUpdateStatus,
    getAutoUpdateStatus,
    () => null
  );
  const [updateAvailable, setUpdateAvailable] =
    useState<UpdateAvailableState | null>(null);

  useEffect(() => {
    const handleUpdateAvailable = async (event: Event) => {
      const detail = parseUpdateAvailableState((event as CustomEvent).detail);
      const newVersion = detail?.version;
      const currentVersion = document
        .querySelector('meta[name="app-version"]')
        ?.getAttribute('content');

      if (detail) {
        if (currentVersion && currentVersion === detail.version) {
          return;
        }
        setUpdateAvailable(detail);
      }

      try {
        const res = await fetch(`./version.json?t=${Date.now()}`);
        if (res.ok) {
          const data = parseUpdateAvailableState(await res.json());
          if (data && (!newVersion || data.version === newVersion)) {
            if (currentVersion && data.version === currentVersion) {
              return;
            }

            setUpdateAvailable(data);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch version.json:', error);
      }
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    const pendingUpdate = getPendingUpdateReadyState();
    if (pendingUpdate) {
      void handleUpdateAvailable(
        new CustomEvent('sw-update-available', { detail: pendingUpdate })
      );
    }

    if (process.env.NODE_ENV === 'development') {
      (
        window as Window & {
          __debugTriggerUpdate?: (version?: string) => void;
        }
      ).__debugTriggerUpdate = (version = '9.9.9') => {
        window.dispatchEvent(
          new CustomEvent('sw-update-available', {
            detail: { version },
          })
        );
      };
    }

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const available = automaticUpdate
    ? {
        version: automaticUpdate.version,
        changelog:
          updateAvailable?.version === automaticUpdate.version
            ? updateAvailable.changelog
            : undefined,
      }
    : updateAvailable;
  if (!available) {
    return null;
  }

  return (
    <VersionUpdatePromptContent
      updateAvailable={available}
      automaticUpdate={automaticUpdate}
    />
  );
};
