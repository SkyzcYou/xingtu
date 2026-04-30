import React, { useEffect, useState } from 'react';
import { useBoard } from '@plait-board/react-board';
import { PlaitBoard } from '@plait/core';
import { Z_INDEX } from '../../constants/z-index';
import { MessageHornIcon, WeComIcon } from '../icons';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover';
import { ToolButton } from '../tool-button';
import './feedback-button.scss';

const QR_CODE_URL = 'https://tuziai.oss-cn-shenzhen.aliyuncs.com/aitu/AiTu.png';
const SERVICE_QR_CODE_URL = 'https://tuziai.oss-cn-shenzhen.aliyuncs.com/linkme.png';

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

export const FeedbackButton: React.FC = () => {
  const board = useBoard();
  const container = PlaitBoard.getBoardContainer(board);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const img1 = new Image();
    img1.src = QR_CODE_URL;
    const img2 = new Image();
    img2.src = SERVICE_QR_CODE_URL;
  }, []);

  return (
    <Popover placement="right-end" sideOffset={12} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolButton
          type="icon"
          icon={<WeComIcon />}
          aria-label="用户反馈群"
          tooltip="用户反馈群"
          tooltipPlacement="right"
          selected={open}
          visible={true}
          data-track="toolbar_click_feedback"
          onPointerDown={(e) => {
            e.event.stopPropagation();
          }}
          onClick={() => setOpen(!open)}
        />
      </PopoverTrigger>
      <PopoverContent container={container} style={{ zIndex: Z_INDEX.POPOVER_FEEDBACK }}>
        <div className="feedback-qrcode-content">
          <div className="feedback-qrcode-grid">
            <div className="feedback-qrcode-item">
              <img
                src={QR_CODE_URL}
                alt="用户反馈群二维码"
                className="feedback-qrcode-image"
              />
              <div className="feedback-qrcode-text">用户反馈群</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
