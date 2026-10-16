import { useId, type ReactNode } from 'react';

export function EmptyState({ icon, title, description, children, className = '' }: {
  icon?: ReactNode; title: string; description: string; children?: ReactNode; className?: string;
}) {
  const id = useId();
  return <section aria-labelledby={id} className={`yada-empty-state ${className}`}>
    {icon && <div className="yada-empty-icon" aria-hidden="true">{icon}</div>}
    <h2 id={id}>{title}</h2><p>{description}</p>
    {children && <div className="yada-empty-actions">{children}</div>}
  </section>;
}
