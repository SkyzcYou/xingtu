import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action && <div className="section-card__action">{action}</div>}
      </header>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
