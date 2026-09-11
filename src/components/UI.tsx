import type { ReactNode } from 'react';
import type { StatutCommande } from '../types';
import { statutLabels } from '../lib/api';

export function StatusBadge({ statut }: { statut: StatutCommande }) {
  return <span className={`badge badge-${statut.toLowerCase()}`}>{statutLabels[statut]}</span>;
}

export function StatCard({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: number | string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className={`stat-card ${alert ? 'stat-card-alert' : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
