import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterDescriptionList } from './CharacterDescriptionList';

const characters = [
  {
    id: 'char_1',
    name: '小女孩 (Lily)',
    description: 'A cute little girl with a yellow bucket hat.',
  },
];

describe('CharacterDescriptionList component', () => {
  it('renders nothing without characters', () => {
    const { container } = render(
      <CharacterDescriptionList characters={[]} onChange={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('emits description changes', () => {
    const onChange = vi.fn();
    render(
      <CharacterDescriptionList characters={characters} onChange={onChange} />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'new prompt' },
    });

    expect(onChange).toHaveBeenCalledWith('char_1', 'new prompt');
  });
});
