import { useMemo } from 'react';
import { ATTACHED_ELEMENT_CLASS_NAME } from '@plait/core';
import { createPlanetAvatarDataUri } from 'planet-avatar';
import { Z_INDEX } from '../constants/z-index';
import './canvas-avatar-placeholder.scss';

export interface CanvasAvatarPlaceholderProps {
  seed: string | number;
}

export const CanvasAvatarPlaceholder = ({ seed }: CanvasAvatarPlaceholderProps) => {
  const src = useMemo(
    () =>
      createPlanetAvatarDataUri({
        seed,
        size: 28,
        title: '用户头像',
      }),
    [seed]
  );

  return (
    <div
      className={`canvas-avatar-placeholder ${ATTACHED_ELEMENT_CLASS_NAME}`}
      style={{ zIndex: Z_INDEX.VIEW_NAVIGATION }}
      data-testid="canvas-avatar-placeholder"
    >
      <span className="canvas-avatar-placeholder__inner">
        <img
          className="canvas-avatar-placeholder__image"
          src={src}
          alt="用户头像"
          draggable={false}
        />
      </span>
    </div>
  );
};
