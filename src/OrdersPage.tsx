import { FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate, money, stages, WorkOrder } from './types';
import { PageHeader } from './components';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function OrdersPage({ orders, onUpdate, onSelect }: { orders: WorkOrder[]; onUpdate: () => Promise<void>; onSelect: (order: WorkOrder) => void }) {
  const move = async (order: WorkOrder, direction: number) => {
    const next = stages[stages.indexOf(order.stage) + direction];
    if (!next) return;
    await supabase.from('work_orders').update({ stage: next, exit_date: next === 'Entregue' ? new Date().toISOString().slice(0, 10) : null }).eq('id', order.id);
    await onUpdate();
  };

  return (
    <div className="fade-in">
      <PageHeader eyebrow="OPERAÇÃO / PÁTIO" title="Ordens de serviço" description="Clique em um veículo para abrir o prontuário completo da OS." action={<div className="pill-info"><span className="status-dot" /> {orders.length} OS no pátio</div>} />
      <div className="kanban">
        {stages.map((stage, index) => (
          <section className="kanban-column" key={stage}>
            <div className="column-heading"><div><span className="stage-number">0{index + 1}</span><strong>{stage}</strong></div><span>{orders.filter((o) => o.stage === stage).length}</span></div>
            <div className="kanban-list">
              {orders.filter((o) => o.stage === stage).map((order) => (
                <div className="order-card clickable" key={order.id} onClick={() => onSelect(order)}>
                  <div className="order-code">{order.code}<span>{formatDate(order.entry_date)}</span></div>
                  <h4>{order.vehicle}</h4>
                  <div className="plate">Placa: {order.plate}</div>
                  <p>{order.customer}</p>
                  <div className="order-footer">
                    <strong>{money(Number(order.total))}</strong>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button disabled={index === 0} onClick={() => move(order, -1)} aria-label="Voltar etapa"><ArrowLeft size={13} /></button>
                      <button disabled={index === stages.length - 1} onClick={() => move(order, 1)} aria-label="Avançar etapa"><ArrowRight size={13} /></button>
                    </div>
                  </div>
                  <div className="order-open-hint">Clique para abrir o prontuário</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
