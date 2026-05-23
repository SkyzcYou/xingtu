import { Link, Outlet } from '@tanstack/react-router';
import {
  Activity,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from 'tdesign-react';
import { useAuth } from '../lib/auth/auth-context';
import { getDisplayName, getEmail } from '../lib/auth/auth-roles';
import './AppShell.scss';

const navItems = [
  { to: '/', label: '总览', icon: LayoutDashboard },
  { to: '/profile', label: 'API Key 管理', icon: KeyRound },
  { to: '/sync', label: '同步审计', icon: ShieldCheck },
  { to: '/settings', label: '管理员设置', icon: Settings },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <div className="admin-shell__brand">
          <div className="admin-shell__logo">星</div>
          <div>
            <strong>星图</strong>
            <span>管理员控制台</span>
          </div>
        </div>

        <nav className="admin-shell__nav" aria-label="管理员控制台导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="admin-shell__nav-item"
                activeProps={{ className: 'admin-shell__nav-item admin-shell__nav-item--active' }}
                activeOptions={{ exact: item.to === '/' }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="admin-shell__main">
        <header className="admin-shell__topbar">
          <div>
            <span>Backend Web</span>
            <strong>管理员管理星图账号配置</strong>
          </div>
          <div className="admin-shell__topbar-actions">
            <div className="admin-shell__env">
              <Activity size={16} />
              <span>TanStack React</span>
            </div>
            <Link to="/auth/profile" className="admin-shell__account">
              <div className="admin-shell__avatar">
                <UserRound size={16} />
              </div>
              <div>
                <strong>{getDisplayName(user)}</strong>
                <span>{getEmail(user)}</span>
              </div>
            </Link>
            <Button
              size="small"
              variant="outline"
              icon={<LogOut size={15} />}
              onClick={() => void logout()}
            >
              退出
            </Button>
          </div>
        </header>
        <div className="admin-shell__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
