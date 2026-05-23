import { Button } from 'tdesign-react';

interface PageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function PageError({
  title = '加载失败',
  message,
  onRetry,
}: PageErrorProps) {
  return (
    <div className="page-state page-state--error">
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>重试</Button>}
    </div>
  );
}
