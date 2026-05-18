import { BaseDrawer } from '../side-drawer/BaseDrawer';
import { useDeviceType } from '../../hooks/useDeviceType';
import { DRAWER_PIN_KEYS } from '../../utils/drawer-pin';
import {
  ProfileContent,
  type ProfileContentProps,
} from './profile-dialog';

export interface ProfilePanelProps {
  expanded: boolean;
  onClose: () => void;
  onProfileChange?: ProfileContentProps['onProfileChange'];
}

const PROFILE_DRAWER_WIDTH_KEY = 'profile-drawer-width';

export const ProfilePanel = ({
  expanded,
  onClose,
  onProfileChange,
}: ProfilePanelProps) => {
  const { isMobile, isTablet } = useDeviceType();

  return (
    <BaseDrawer
      isOpen={expanded}
      onClose={onClose}
      title="个人资料"
      position="toolbar-right"
      width="responsive"
      storageKey={PROFILE_DRAWER_WIDTH_KEY}
      pinStorageKey={DRAWER_PIN_KEYS.profile}
      showBackdrop={false}
      closeOnEsc={false}
      showCloseButton={true}
      className="profile-panel"
      contentClassName="profile-panel__content"
      resizable={true}
      minWidth={320}
      maxWidth={640}
      defaultWidth={440}
      data-testid="profile-panel"
    >
      <ProfileContent
        active={expanded}
        compact={isMobile || isTablet}
        onProfileChange={onProfileChange}
      />
    </BaseDrawer>
  );
};

export default ProfilePanel;
