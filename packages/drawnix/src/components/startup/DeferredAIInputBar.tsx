import React, { useEffect, useRef } from 'react';
import { WorkflowProvider } from '../../contexts/WorkflowContext';
import { ModelHealthProvider } from '../../contexts/ModelHealthContext';
import { AIInputBar } from '../ai-input-bar/AIInputBar';

interface DeferredAIInputBarProps {
  isDataReady: boolean;
  activationKey: number;
  onEnableToolWindows?: () => void;
}

export function DeferredAIInputBar({
  isDataReady,
  activationKey,
  onEnableToolWindows,
}: DeferredAIInputBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activationKey <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      const textarea = containerRef.current?.querySelector<HTMLTextAreaElement>(
        '[data-testid="ai-input-textarea"]'
      );
      textarea?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activationKey]);

  return (
    <WorkflowProvider>
      <ModelHealthProvider>
        <div ref={containerRef}>
          <AIInputBar
            isDataReady={isDataReady}
            onEnableToolWindows={onEnableToolWindows}
          />
        </div>
      </ModelHealthProvider>
    </WorkflowProvider>
  );
}

export default DeferredAIInputBar;
