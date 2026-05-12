import React, { useCallback, useEffect, useState } from 'react';
import { Button, Dialog } from 'tdesign-react';
import { RefreshIcon } from 'tdesign-icons-react';
import { useTaskQueue } from '../../hooks/useTaskQueue';
import { hasActiveLLMTasksSync } from '../../utils/active-tasks';
import './version-update-prompt.scss';

interface UpdateAvailableState {
  version: string;
  changelog?: string[];
}

function parseUpdateAvailableState(value: unknown): UpdateAvailableState | null {
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
}: {
  updateAvailable: UpdateAvailableState;
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
        subscription = workflowSubmissionService.subscribeToAllEvents(
          syncActiveTasks
        );
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
    if (hasActiveTasks) {
      return;
    }

    setShowChangelog(false);
    window.dispatchEvent(new CustomEvent('user-confirmed-upgrade'));
  }, [hasActiveTasks]);

  const handleShowChangelog = useCallback(() => {
    setShowChangelog(true);
  }, []);

  const handleCloseChangelog = useCallback(() => {
    setShowChangelog(false);
  }, []);

  return (
    <>
      <div className="version-update-prompt">
        <div className="version-update-prompt__content">
          <span className="version-update-prompt__text">
            {hasActiveTasks
              ? `新版本 v${updateAvailable.version} 已就绪，任务完成后可更新`
              : `新版本 v${updateAvailable.version} 已就绪`}
          </span>
          {updateAvailable.changelog && updateAvailable.changelog.length > 0 && (
            <Button
              theme="default"
              variant="text"
              size="small"
              onClick={handleShowChangelog}
            >
              查看更新内容
            </Button>
          )}
          <Button
            theme="primary"
            size="small"
            onClick={handleUpdate}
            icon={<RefreshIcon />}
            disabled={hasActiveTasks}
          >
            {hasActiveTasks ? '任务运行中' : '立即更新'}
          </Button>
        </div>
      </div>

      <Dialog
        header={`新版本 v${updateAvailable.version} 更新内容`}
        visible={showChangelog}
        onClose={handleCloseChangelog}
        width={600}
        footer={
          <Button
            theme="primary"
            onClick={handleUpdate}
            disabled={hasActiveTasks}
          >
            {hasActiveTasks ? '任务运行中' : '立即更新'}
          </Button>
        }
      >
        <div
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
      (window as Window & {
        __debugTriggerUpdate?: (version?: string) => void;
      }).__debugTriggerUpdate = (version = '9.9.9') => {
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

  if (!updateAvailable) {
    return null;
  }

  return <VersionUpdatePromptContent updateAvailable={updateAvailable} />;
};
