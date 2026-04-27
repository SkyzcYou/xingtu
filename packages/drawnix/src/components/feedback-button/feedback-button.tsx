import React from 'react';
import { MessageHornIcon } from '../icons';
import { ToolButton } from '../tool-button';
import './feedback-button.scss';

interface MessageButtonProps {
  open: boolean;
  onToggle?: () => void;
}

export const MessageButton: React.FC<MessageButtonProps> = ({
  open,
  onToggle,
}) => {
  return (
    <ToolButton
      type="icon"
      icon={
        <span className="message-button__icon">
          <MessageHornIcon />
          <span className="message-button__dot" />
        </span>
      }
      aria-label="消息中心"
      tooltip="消息中心"
      tooltipPlacement="right"
      selected={open}
      visible={true}
      data-track="toolbar_click_messages"
      data-testid="toolbar-messages"
      onPointerDown={(e) => {
        e.event.stopPropagation();
      }}
      onClick={onToggle}
    />
  );
};
