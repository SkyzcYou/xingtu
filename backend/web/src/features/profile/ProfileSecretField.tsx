import { useCallback, useMemo, useState } from 'react';
import { Button, Space } from 'tdesign-react';

interface ProfileSecretFieldProps {
  value: string;
}

export function ProfileSecretField({ value }: ProfileSecretFieldProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedValue = useMemo(() => maskSecret(value), [value]);

  const handleToggle = useCallback(() => {
    setVisible((current) => !current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.debug('Failed to copy API key', error);
    }
  }, [value]);

  return (
    <Space size="small" breakLine>
      <code className="secret-field">{visible ? value : maskedValue}</code>
      <Button size="small" variant="outline" onClick={handleToggle}>
        {visible ? '隐藏' : '显示'}
      </Button>
      <Button size="small" variant="outline" onClick={handleCopy}>
        {copied ? '已复制' : '复制'}
      </Button>
    </Space>
  );
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(12)}${value.slice(-4)}`;
}
