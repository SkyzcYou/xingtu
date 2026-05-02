import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComboInput, type ComboOptionGroup } from './ComboInput';

const groupedOptions: ComboOptionGroup[] = [
  {
    label: '转化',
    options: [
      { label: '种草带货', value: '种草带货：强钩子 + 场景体验 + CTA' },
      { label: '直播引流', value: '直播引流：限时感 + 到场理由' },
    ],
  },
];

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('ComboInput', () => {
  it('keeps the first opened menu visible through the opening pointer event', () => {
    vi.useFakeTimers();
    render(
      <ComboInput
        value=""
        onChange={vi.fn()}
        options={groupedOptions}
        placeholder="选择用途"
      />
    );

    fireEvent.focus(screen.getByPlaceholderText('选择用途'));
    expect(screen.queryByText('种草带货')).not.toBeNull();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('种草带货')).not.toBeNull();

    vi.advanceTimersByTime(200);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('种草带货')).toBeNull();
  });

  it('selects a portalled option', () => {
    const onChange = vi.fn();
    render(
      <ComboInput
        value=""
        onChange={onChange}
        options={groupedOptions}
        placeholder="选择用途"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('选择用途'));
    const menu = screen.getByText('种草带货').closest('.va-combo-menu');
    expect(menu?.parentElement).toBe(document.body);

    fireEvent.mouseDown(screen.getByText('直播引流'));
    expect(onChange).toHaveBeenCalledWith('直播引流：限时感 + 到场理由');
    expect(screen.queryByText('直播引流')).toBeNull();
  });
});
