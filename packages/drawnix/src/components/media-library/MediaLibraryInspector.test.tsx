import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MediaLibraryInspector } from './MediaLibraryInspector';
import {
  AssetSource,
  AssetType,
  type Asset,
} from '../../types/asset.types';

vi.mock('tdesign-react', () => ({
  Button: ({ children, icon, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  ),
  Dialog: ({
    visible,
    header,
    children,
    onClose,
    onConfirm,
    confirmBtn,
    cancelBtn,
  }: any) =>
    visible ? (
      <div role="dialog" aria-label={header}>
        <div>{header}</div>
        {children}
        <button type="button" onClick={onClose}>
          {cancelBtn}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmBtn}
        </button>
      </div>
    ) : null,
  Input: ({ value, onChange, placeholder, disabled }: any) => (
    <input
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
  MessagePlugin: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../hooks/use-drawnix', () => ({
  useDrawnix: () => ({ board: null }),
}));

vi.mock('../../hooks/useAssetSize', () => ({
  useAssetSize: (_id: string, _url: string, size?: number) => size,
}));

vi.mock('../dialog/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('../shared/hover', () => ({
  HoverTip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const imageAsset: Asset = {
  id: 'asset-1',
  type: AssetType.IMAGE,
  source: AssetSource.LOCAL,
  url: '/__aitu_cache__/image/red-car.png',
  name: '素材标题',
  mimeType: 'image/png',
  createdAt: 1,
  size: 1024,
  prompt: 'red car product photo',
};

function renderInspector(overrides: Partial<React.ComponentProps<typeof MediaLibraryInspector>> = {}) {
  return render(
    <MediaLibraryInspector
      asset={imageAsset}
      onRename={vi.fn()}
      onDelete={vi.fn()}
      onDownload={vi.fn()}
      showSelectButton={false}
      {...overrides}
    />
  );
}

describe('MediaLibraryInspector subject action', () => {
  it('requires a separate subject name when marking an image as subject', async () => {
    const onMarkAsSubject = vi.fn().mockResolvedValue(undefined);
    renderInspector({ onMarkAsSubject });

    fireEvent.click(screen.getByRole('button', { name: /设为主体/ }));
    fireEvent.change(screen.getByPlaceholderText('例如：Lily / 银色耳机 / 红色跑车'), {
      target: { value: '红色跑车' },
    });
    fireEvent.change(screen.getByPlaceholderText('可选；用于回填脚本中的主体提示词'), {
      target: { value: 'red sports car, glossy paint' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(onMarkAsSubject).toHaveBeenCalledWith(imageAsset, {
        name: '红色跑车',
        prompt: 'red sports car, glossy paint',
      });
    });
  });
});
