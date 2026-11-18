import { JSX } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, X } from 'lucide-react';

export function NavItem({ icon, label, active, count, onClick }: { icon: JSX.Element; label: string; active: boolean; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} translate="no">{icon}<span>{label}</span>{count !== undefined && <em>{count}</em>}</button>;
}

export function viewLabel(view: string) {
  return ({ dashboard: 'Início', budgets: 'Orçamentos', orders: 'Ordens de serviço', inventory: 'Estoque unificado', quotes: 'Cotações', customers: 'Clientes', finance: 'Financeiro', settings: 'Configurações' })[view] ?? view;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: JSX.Element }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function Metric({ title, value, trend, positive, warning, icon }: { title: string; value: string; trend: string; positive?: boolean; warning?: boolean; icon: JSX.Element }) {
  return <div className="metric-card"><div className="metric-icon">{icon}</div><div className="metric-title">{title}</div><div className="metric-value">{value}</div><div className={`metric-trend ${positive ? 'positive' : ''} ${warning ? 'warning' : ''}`}>{positive ? <ArrowUpRight size={14} /> : warning ? <ArrowDownRight size={14} /> : null}{trend}</div></div>;
}

export function Activity({ icon, title, detail, value }: { icon: JSX.Element; title: string; detail: string; value: string }) {
  return <div className="activity-row"><div className="activity-icon">{icon}</div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><b>{value}</b></div>;
}

export function Quick({ icon, title, text, onClick }: { icon: JSX.Element; title: string; text: string; onClick: () => void }) {
  return <button className="quick-card" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ArrowUpRight size={17} /></button>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status.toLowerCase().replace(/[ /]/g, '-')}`}><i />{status}</span>;
}

export function EmptyState({ icon, title, text, action, actionLabel }: { icon: JSX.Element; title: string; text: string; action: () => void; actionLabel?: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button className="button button-primary" onClick={action}><Check size={16} /> {actionLabel ?? 'Criar'}</button></div>;
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="modal-header"><h2>{title}</h2><button type="button" className="close-button" onClick={onClose}><X size={19} /></button></div>;
}

export function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="section-title"><span>{number}</span><h3>{title}</h3></div>;
}

export function ConfirmDialog({ icon, title, message, confirmLabel, onCancel, onConfirm }: { icon: JSX.Element; title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><div className="modal-card confirm-card"><div className="confirm-icon">{icon}</div><h2>{title}</h2><p>{message}</p><div className="modal-actions"><button className="button button-secondary" onClick={onCancel}>Cancelar</button><button className="button button-negative" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}
