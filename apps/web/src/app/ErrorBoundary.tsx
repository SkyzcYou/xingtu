import React, { Component, ErrorInfo } from 'react';
import { collectAndDownloadErrorLog } from '../utils/error-log-exporter';

const LAZY_CHUNK_RETRY_KEY_PREFIX = 'aitu:lazy-chunk-retry';
const LAZY_CHUNK_RETRY_PARAM = '_lazy_chunk_retry';
const LAZY_CHUNK_RETRY_TS_PARAM = '_t';
const STATIC_CACHE_NAME_PREFIX = 'drawnix-static-v';
const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
  /Loading chunk [\w-]+ failed/i,
  /ChunkLoadError/i,
];
let lazyAssetRecoveryScheduled = false;

type ErrorLikeEvent = Event & {
  error?: unknown;
  reason?: unknown;
  payload?: unknown;
  message?: string;
};

function getAppVersion(): string {
  if (typeof document === 'undefined') {
    return 'unknown';
  }
  return (
    document.querySelector('meta[name="app-version"]')?.getAttribute('content') ||
    'unknown'
  );
}

function getEventTargetAssetUrl(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  const assetTarget = target as HTMLElement & {
    src?: string;
    currentSrc?: string;
    href?: string;
  };
  return assetTarget.currentSrc || assetTarget.src || assetTarget.href || null;
}

function serializeError(error: unknown, depth = 0): string {
  if (error instanceof Error) {
    const parts = [error.name, error.message, error.stack];
    const errorWithCause = error as Error & { cause?: unknown };
    if (errorWithCause.cause && depth < 2) {
      parts.push(serializeError(errorWithCause.cause, depth + 1));
    }
    return parts.filter(Boolean).join('\n');
  }

  if (typeof Event !== 'undefined' && error instanceof Event) {
    const event = error as ErrorLikeEvent;
    const parts = [`event:${event.type}`];
    const targetAssetUrl = getEventTargetAssetUrl(event.target);
    if (event.message) {
      parts.push(event.message);
    }
    if (targetAssetUrl) {
      parts.push(targetAssetUrl);
    }
    if (depth < 2) {
      [event.error, event.reason, event.payload].forEach((value) => {
        if (value && value !== error) {
          parts.push(serializeError(value, depth + 1));
        }
      });
    }
    return parts.filter(Boolean).join('\n');
  }

  return String(error ?? '');
}

function extractModuleKey(errorText: string): string {
  const matchedUrl = errorText.match(
    /https?:\/\/[^\s)'"]+\.(?:js|css)(?:\?[^\s)'"]*)?/i
  );
  if (!matchedUrl) {
    return 'unknown-module';
  }
  try {
    return new URL(matchedUrl[0]).pathname;
  } catch {
    return matchedUrl[0];
  }
}

function isRecoverableDynamicImportError(error: unknown): boolean {
  const errorText = serializeError(error);
  return DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) => pattern.test(errorText));
}

async function prepareDynamicImportRecoveryReload(
  moduleKey: string,
  errorText: string
): Promise<void> {
  const cleanupTasks: Promise<unknown>[] = [];
  try {
    navigator.serviceWorker?.controller?.postMessage({
      type: 'RECOVER_DYNAMIC_IMPORT_FAILURE',
      appVersion: getAppVersion(),
      moduleKey,
      error: errorText.slice(0, 500),
    });
  } catch (error) {
    console.debug('[ErrorBoundary] Failed to notify service worker:', error);
  }

  if (typeof caches !== 'undefined') {
    cleanupTasks.push(
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith(STATIC_CACHE_NAME_PREFIX))
            .map((name) => caches.delete(name))
        )
      )
    );
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.update())
    );
  }

  await Promise.allSettled(cleanupTasks);
}

export function tryRecoverDynamicImportError(error: unknown): boolean {
  if (!isRecoverableDynamicImportError(error)) {
    return false;
  }
  if (lazyAssetRecoveryScheduled) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }

  const errorText = serializeError(error);
  const moduleKey = extractModuleKey(errorText);
  const retryKey = `${LAZY_CHUNK_RETRY_KEY_PREFIX}:${getAppVersion()}:${moduleKey}`;
  try {
    if (sessionStorage.getItem(retryKey) === '1') {
      return false;
    }
    sessionStorage.setItem(retryKey, '1');
  } catch {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has(LAZY_CHUNK_RETRY_PARAM)) {
      return false;
    }
  }

  lazyAssetRecoveryScheduled = true;
  const reloadUrl = new URL(window.location.href);
  reloadUrl.searchParams.set(LAZY_CHUNK_RETRY_PARAM, '1');
  reloadUrl.searchParams.set(LAZY_CHUNK_RETRY_TS_PARAM, String(Date.now()));
  console.warn(
    '[ErrorBoundary] Detected stale lazy asset. Reloading once to recover.',
    error
  );

  let didReload = false;
  const reload = () => {
    if (didReload) {
      return;
    }
    didReload = true;
    window.location.replace(reloadUrl.toString());
  };
  window.setTimeout(reload, 700);
  void prepareDynamicImportRecoveryReload(moduleKey, errorText).finally(reload);
  return true;
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  recoveringFromChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    recoveringFromChunkError: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const recoveringFromChunkError = tryRecoverDynamicImportError(error);
    this.setState({ errorInfo, recoveringFromChunkError });
    if (!recoveringFromChunkError) {
      console.error('[ErrorBoundary] React render error:', error, errorInfo);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.state.recoveringFromChunkError) {
      return (
        <ErrorFallbackUI
          variant="error"
          title="检测到静态资源已更新"
          description="当前页面引用的懒加载资源已失效，正在自动刷新一次以恢复工作台。若长时间未恢复，可手动点击安全模式。"
          errorMessage={this.state.error?.message || '动态资源加载失败'}
          errorStack={this.state.error?.stack}
          componentStack={this.state.errorInfo?.componentStack ?? undefined}
          onExportLog={() =>
            collectAndDownloadErrorLog(this.state.error, this.state.errorInfo)
          }
          onSafeModeReload={safeModeReload}
          onGoToDebug={goToDebug}
        />
      );
    }

    return (
      <ErrorFallbackUI
        variant="error"
        errorMessage={this.state.error?.message || '未知错误'}
        errorStack={this.state.error?.stack}
        componentStack={this.state.errorInfo?.componentStack ?? undefined}
        onExportLog={() =>
          collectAndDownloadErrorLog(this.state.error, this.state.errorInfo)
        }
        onSafeModeReload={safeModeReload}
        onGoToDebug={goToDebug}
      />
    );
  }
}

export function safeModeReload(): void {
  try {
    localStorage.setItem('aitu_safe_mode', 'true');
  } catch (error) {
    console.debug('[ErrorBoundary] Failed to enable safe mode:', error);
  }
  window.location.reload();
}

export function goToDebug(): void {
  window.location.href = '/sw-debug.html';
}

type Variant = 'crash' | 'error';
type ButtonVariant = 'primary' | 'secondary';

export interface ErrorFallbackProps {
  variant: Variant;
  crashCount?: number;
  memoryInfo?: { used: string; limit: string; percent: number } | null;
  onIgnore?: () => void;
  title?: string;
  description?: string;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  onExportLog?: () => void;
  onSafeModeReload: () => void;
  onGoToDebug: () => void;
}

const cssVar = (name: string, fallback: string) => `var(${name}, ${fallback})`;
const textPrimary = cssVar('--xingtu-glass-text-primary', '#161718');
const textSecondary = cssVar('--xingtu-glass-text-secondary', 'rgba(22,23,24,0.72)');
const textTertiary = cssVar('--xingtu-glass-text-tertiary', 'rgba(22,23,24,0.5)');
const glassBorder = `1px solid ${cssVar('--xingtu-glass-border', 'rgba(22,23,24,0.15)')}`;
const softBorder = `1px solid ${cssVar('--xingtu-glass-border-soft', 'rgba(22,23,24,0.12)')}`;
const ringShadow = `0 0 0 3px ${cssVar('--xingtu-glass-control-ring', 'rgba(22,23,24,0.08)')}`;

const VARIANT_CONFIG: Record<Variant, { stroke: string; icon: React.ReactNode; title: string; desc: string }> = {
  crash: {
    stroke: textPrimary,
    icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    title: '检测到页面异常退出',
    desc: '',
  },
  error: {
    stroke: cssVar('--color-destructive', '#dc2626'),
    icon: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>,
    title: '应用渲染出错',
    desc: '页面遇到了意外错误，可能是画布数据异常或浏览器内存不足。',
  },
};

export const ErrorFallbackUI: React.FC<ErrorFallbackProps> = ({
  variant,
  crashCount,
  memoryInfo,
  onIgnore,
  title,
  description,
  errorMessage,
  errorStack,
  componentStack,
  onExportLog,
  onSafeModeReload,
  onGoToDebug,
}) => {
  const [showDetail, setShowDetail] = React.useState(false);
  const cfg = VARIANT_CONFIG[variant];
  const detailText = [errorStack, componentStack ? `Component Stack:${componentStack}` : undefined]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={cfg.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {cfg.icon}
          </svg>
        </div>
        <h2 style={styles.title}>{title || cfg.title}</h2>
        {variant === 'crash' && crashCount != null && (
          <p style={styles.desc}>
            页面已连续 {crashCount} 次未能正常加载，可能是因为：
            <br />• 画布元素过多导致内存不足
            <br />• 浏览器内存限制
            <br />
            <br />
            建议使用「安全模式」创建空白画布，稍后可从侧边栏切换到其他画布。
          </p>
        )}
        {variant === 'error' && (description || cfg.desc) && <p style={styles.desc}>{description || cfg.desc}</p>}
        {memoryInfo && <MemoryBar info={memoryInfo} />}
        {variant === 'error' && errorMessage && (
          <div style={styles.errorBox}>
            <div style={styles.errorMsg}>{errorMessage}</div>
            {detailText && <button type="button" onClick={() => setShowDetail((v) => !v)} style={styles.detailToggle}>{showDetail ? '收起详情' : '展开详情'}</button>}
            {showDetail && <pre style={styles.errorDetail}>{detailText}</pre>}
          </div>
        )}
        <div style={styles.btnRow}>
          {variant === 'crash' && onIgnore && <HoverButton label="继续加载" onClick={onIgnore} />}
          {variant === 'error' && onExportLog && <HoverButton label="导出错误日志" onClick={onExportLog} />}
          <HoverButton label="安全模式" onClick={onSafeModeReload} variant="primary" />
        </div>
        <div style={styles.divider} />
        <div style={styles.helpRow}>
          <img src="./logo/wechat-qr.jpg" alt="企业微信二维码" style={styles.qrcode} />
          <div style={styles.helpText}>
            <p style={styles.helpTitle}>需要帮助？</p>
            <p style={styles.helpDesc}>扫码联系客服，或前往调试页面导出完整日志与备份数据</p>
            <HoverButton label="打开调试页面" onClick={onGoToDebug} small />
          </div>
        </div>
      </div>
    </div>
  );
};

const MemoryBar: React.FC<{ info: { used: string; limit: string; percent: number } }> = ({ info }) => {
  const percent = Math.min(info.percent, 100);
  const valueColor = info.percent > 75 ? cssVar('--color-destructive', '#dc2626') : textSecondary;
  const fillBackground = info.percent > 75 ? valueColor : cssVar('--xingtu-generation-running-loading-progress-gradient', 'linear-gradient(90deg, rgba(22,23,24,0.52), rgba(22,23,24,0.82))');
  return (
    <div style={styles.memoryBox}>
      <div style={styles.memoryLabel}>当前内存使用情况</div>
      <div style={styles.memoryValues}>
        <span>{info.used} / {info.limit}</span>
        <span style={{ ...styles.memoryPercent, color: valueColor }}>{info.percent.toFixed(0)}%</span>
      </div>
      <div style={styles.memoryTrack}>
        <div style={{ ...styles.memoryFill, width: `${percent}%`, background: fillBackground }} />
      </div>
    </div>
  );
};

const HoverButton: React.FC<{ label: string; onClick: () => void; variant?: ButtonVariant; small?: boolean }> = ({
  label,
  onClick,
  variant = 'secondary',
  small,
}) => {
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const active = hovered || focused;
  const variantStyle = variant === 'primary' ? styles.btnPrimary : styles.btnSecondary;
  const hoverStyle = variant === 'primary' ? styles.btnPrimaryHover : styles.btnSecondaryHover;
  const btnStyle = { ...(small ? styles.btnSmall : styles.btn), ...variantStyle, ...(active ? hoverStyle : undefined) };
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={btnStyle}>
      {label}
    </button>
  );
};

function buttonBase(small = false): React.CSSProperties {
  return {
    flex: small ? '0 0 auto' : 1,
    minHeight: small ? 34 : 42,
    padding: small ? '0 14px' : '0 18px',
    borderRadius: small ? 10 : 12,
    fontFamily: 'inherit',
    fontSize: small ? 13 : 14,
    fontWeight: small ? 600 : 650,
    cursor: 'pointer',
    transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
  };
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: cssVar('--app-boot-bg', 'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.72), transparent 34%), radial-gradient(circle at 82% 12%, rgba(218,220,224,0.5), transparent 32%), linear-gradient(135deg, #f4f4f2 0%, #e9ebe8 48%, #f7f7f5 100%)') },
  card: { width: 'min(520px, calc(100vw - 48px))', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', boxSizing: 'border-box', padding: '28px 24px', borderRadius: 24, background: cssVar('--xingtu-glass-bg', 'rgba(218,220,224,0.5)'), border: glassBorder, boxShadow: cssVar('--xingtu-glass-shadow', '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)'), backdropFilter: cssVar('--xingtu-glass-blur', 'blur(40px)'), WebkitBackdropFilter: cssVar('--xingtu-glass-blur', 'blur(40px)'), textAlign: 'center' },
  iconWrap: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, margin: '0 auto 16px', borderRadius: 18, background: cssVar('--xingtu-glass-control-bg-hover', 'rgba(255,255,255,0.34)'), border: softBorder, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32)' },
  title: { margin: 0, color: textPrimary, fontSize: 20, fontWeight: 650, lineHeight: 1.4 },
  desc: { margin: '10px auto 0', maxWidth: 420, color: textSecondary, fontSize: 14, lineHeight: 1.7 },
  memoryBox: { marginTop: 18, padding: '12px 14px', borderRadius: 16, background: cssVar('--xingtu-glass-control-bg', 'rgba(255,255,255,0.24)'), border: softBorder, textAlign: 'left' },
  memoryLabel: { marginBottom: 8, color: textTertiary, fontSize: 12 },
  memoryValues: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: textPrimary, fontSize: 14 },
  memoryPercent: { fontWeight: 650, fontVariantNumeric: 'tabular-nums' },
  memoryTrack: { height: 6, marginTop: 10, overflow: 'hidden', borderRadius: 999, background: cssVar('--xingtu-glass-control-ring', 'rgba(22,23,24,0.08)') },
  memoryFill: { height: '100%', borderRadius: 999, transition: 'width 0.24s ease' },
  errorBox: { marginTop: 18, padding: '12px 14px', borderRadius: 16, background: cssVar('--xingtu-glass-control-bg', 'rgba(255,255,255,0.24)'), border: softBorder, textAlign: 'left' },
  errorMsg: { color: cssVar('--color-destructive', '#dc2626'), fontSize: 13, wordBreak: 'break-word' },
  detailToggle: { marginTop: 8, padding: 0, border: 'none', background: 'transparent', color: textTertiary, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' },
  errorDetail: { maxHeight: 150, margin: '8px 0 0', padding: 10, overflow: 'auto', borderRadius: 10, background: cssVar('--xingtu-glass-control-bg-active', 'rgba(255,255,255,0.42)'), color: textSecondary, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  btnRow: { display: 'flex', gap: 10, marginTop: 20 },
  btn: buttonBase(),
  btnSmall: buttonBase(true),
  btnSecondary: { background: cssVar('--xingtu-glass-control-bg', 'rgba(255,255,255,0.24)'), border: softBorder, color: textPrimary },
  btnSecondaryHover: { background: cssVar('--xingtu-glass-control-bg-hover', 'rgba(255,255,255,0.34)'), borderColor: cssVar('--xingtu-glass-border-hover', 'rgba(22,23,24,0.18)'), boxShadow: ringShadow },
  btnPrimary: { background: textPrimary, border: `1px solid ${cssVar('--xingtu-glass-list-selected-border', 'rgba(22,23,24,0.36)')}`, color: cssVar('--xingtu-theme-accent-foreground', '#fff') },
  btnPrimaryHover: { background: cssVar('--aitu-neutral-600', '#525252'), boxShadow: ringShadow, transform: 'translateY(-1px)' },
  divider: { height: 1, margin: '22px 0', background: cssVar('--xingtu-glass-divider', 'rgba(22,23,24,0.1)') },
  helpRow: { display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' },
  qrcode: { width: 92, height: 92, flexShrink: 0, borderRadius: 16, border: softBorder },
  helpText: { flex: 1, minWidth: 0 },
  helpTitle: { margin: '0 0 4px', color: textPrimary, fontSize: 14, fontWeight: 650 },
  helpDesc: { margin: '0 0 12px', color: textTertiary, fontSize: 12, lineHeight: 1.5 },
};
