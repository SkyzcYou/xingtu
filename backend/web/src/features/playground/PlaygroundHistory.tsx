import { useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import {
  getPlaygroundHistoryPage,
  type PlaygroundHistoryRecord,
} from './playground-history.api';

const historyPageSize = 20;

interface PlaygroundHistoryProps {
  onReplay: (record: PlaygroundHistoryRecord) => void;
  syncError: string;
}

export function PlaygroundHistory({ onReplay, syncError }: PlaygroundHistoryProps) {
  const historyQuery = useInfiniteQuery({
    queryKey: ['playground-history'],
    queryFn: ({ pageParam }) => getPlaygroundHistoryPage({
      offset: pageParam,
      limit: historyPageSize,
    }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.hasMore ? page.nextOffset : undefined,
  });
  const records = historyQuery.data?.pages.flatMap((page) => page.records) ?? [];
  const handleLoadMore = useCallback(() => {
    void historyQuery.fetchNextPage();
  }, [historyQuery]);

  return (
    <section className="playground-history" aria-labelledby="playground-history-title">
      <div className="playground-history__header">
        <div>
          <h3 id="playground-history-title">Playground 历史</h3>
          <p>帐号内跨设备同步；再次发起只回填表单，确认提交后才会创建新任务。</p>
        </div>
        {historyQuery.isFetching && <span className="muted-text">同步中…</span>}
      </div>

      {syncError && <div className="playground-history__sync-error" role="alert">{syncError}</div>}
      {historyQuery.error && <p className="form-error">{historyQuery.error.message}</p>}

      {historyQuery.isLoading ? (
        <div className="playground-history__empty">正在加载历史记录…</div>
      ) : records.length === 0 ? (
        <div className="playground-history__empty">暂无历史任务，完成一次文字或生图测试后会自动记录。</div>
      ) : (
        <div className="playground-history__list">
          {records.map((record) => (
            <HistoryCard key={record.id} record={record} onReplay={onReplay} />
          ))}
        </div>
      )}

      {historyQuery.hasNextPage && (
        <div className="playground-history__more">
          <Button
            variant="outline"
            loading={historyQuery.isFetchingNextPage}
            onClick={handleLoadMore}
          >
            加载更多
          </Button>
        </div>
      )}
    </section>
  );
}

interface HistoryCardProps {
  record: PlaygroundHistoryRecord;
  onReplay: (record: PlaygroundHistoryRecord) => void;
}

function HistoryCard({ record, onReplay }: HistoryCardProps) {
  const handleReplay = useCallback(() => onReplay(record), [onReplay, record]);
  const resultLabel = record.taskKind === 'text' ? '文字' : '生图';

  return (
    <article className="playground-history-card">
      <header>
        <div className="playground-history-card__tags">
          <Tag variant="light">{resultLabel}</Tag>
          <Tag theme={record.status === 'succeeded' ? 'success' : 'danger'} variant="light">
            {record.status === 'succeeded' ? '成功' : '失败'}
          </Tag>
          {record.taskKind === 'image' && (
            <Tag variant="light">{record.parameters.mode === 'async' ? '异步' : '同步'}</Tag>
          )}
        </div>
        <time dateTime={record.createdAt}>{formatTimestamp(record.createdAt)}</time>
      </header>

      <div className="playground-history-card__meta">
        <span>{record.model}</span>
        <span>{formatDuration(record.durationMs)}</span>
        {record.taskKind === 'image' && <span>{record.parameters.size}</span>}
      </div>
      <p className="playground-history-card__prompt">{record.prompt}</p>

      {record.status === 'failed' && record.error && (
        <p className="playground-history-card__error">{record.error}</p>
      )}
      {record.taskKind === 'text' && record.result && (
        <p className="playground-history-card__text-result">{record.result.content}</p>
      )}
      {record.taskKind === 'image' && record.result && record.result.images.length > 0 && (
        <div className="playground-history-card__images">
          {record.result.images.map((image, index) => (
            <HistoryImage key={`${image.url}-${index}`} src={image.url} index={index} />
          ))}
        </div>
      )}
      {record.taskKind === 'image' && record.parameters.referenceFileNames.length > 0 && (
        <p className="playground-history-card__references">
          参考图：{record.parameters.referenceFileNames.join('、')}（再次发起时需重新选择）
        </p>
      )}

      <footer>
        <Button size="small" variant="outline" onClick={handleReplay}>再次发起</Button>
      </footer>
    </article>
  );
}

function HistoryImage({ src, index }: { src: string; index: number }) {
  const [available, setAvailable] = useState(true);
  const handleError = useCallback(() => setAvailable(false), []);
  if (!available) {
    return <div className="playground-history-card__image-fallback">图片链接已失效</div>;
  }
  return <img alt={`历史生成结果 ${index + 1}`} src={src} onError={handleError} />;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 1 : 0)}s`;
}
