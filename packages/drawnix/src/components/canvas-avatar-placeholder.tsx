import { ATTACHED_ELEMENT_CLASS_NAME } from '@plait/core';
import { Z_INDEX } from '../constants/z-index';
import './canvas-avatar-placeholder.scss';

export const CanvasAvatarPlaceholder = () => {
  return (
    <div
      className={`canvas-avatar-placeholder ${ATTACHED_ELEMENT_CLASS_NAME}`}
      style={{ zIndex: Z_INDEX.VIEW_NAVIGATION }}
      role="img"
      aria-label="用户头像"
      data-testid="canvas-avatar-placeholder"
    >
      <span className="canvas-avatar-placeholder__inner" />
    </div>
  );
};
