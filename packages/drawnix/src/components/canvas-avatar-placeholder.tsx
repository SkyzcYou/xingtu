import {
  forwardRef,
  useMemo,
  type ButtonHTMLAttributes,
} from 'react';
import { ATTACHED_ELEMENT_CLASS_NAME } from '@plait/core';
import { createPlanetAvatarDataUri } from 'planet-avatar';
import { Z_INDEX } from '../constants/z-index';
import './canvas-avatar-placeholder.scss';

export interface CanvasAvatarPlaceholderProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  seed: string | number;
  selected?: boolean;
}

export const CanvasAvatarPlaceholder = forwardRef<
  HTMLButtonElement,
  CanvasAvatarPlaceholderProps
>(({ seed, selected = false, className, style, ...props }, ref) => {
  const src = useMemo(
    () =>
      createPlanetAvatarDataUri({
        seed,
        size: 28,
        title: '用户头像',
      }),
    [seed]
  );
  const avatarClassName = [
    'canvas-avatar-placeholder',
    ATTACHED_ELEMENT_CLASS_NAME,
    selected ? 'canvas-avatar-placeholder--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...props}
      ref={ref}
      type="button"
      className={avatarClassName}
      style={{ ...style, zIndex: Z_INDEX.VIEW_NAVIGATION }}
      aria-label={props['aria-label'] ?? '账户菜单'}
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
    </button>
  );
});

CanvasAvatarPlaceholder.displayName = 'CanvasAvatarPlaceholder';
