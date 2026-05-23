import { Loading } from 'tdesign-react';

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = '正在加载...' }: PageLoadingProps) {
  return (
    <div className="page-state">
      <Loading loading text={text} />
    </div>
  );
}
