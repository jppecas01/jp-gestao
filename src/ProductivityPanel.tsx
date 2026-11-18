import { useMemo } from 'react';
import { Clock, Package, UserCog } from 'lucide-react';
import { MaterialWithdrawal, money, WorkOrderStep } from './types';

export function ProductivityPanel({ steps, withdrawals }: { steps: WorkOrderStep[]; withdrawals: MaterialWithdrawal[] }) {
  const professionals = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; materialQty: number; materialValue: number }>();
    const ensure = (name: string) => {
      const key = (name || 'Sem profissional').trim();
      if (!map.has(key)) map.set(key, { name: key, minutes: 0, materialQty: 0, materialValue: 0 });
      return map.get(key)!;
    };
    steps.forEach((s) => { if (s.professional && s.minutes_worked > 0) { const p = ensure(s.professional); p.minutes += s.minutes_worked; } });
    withdrawals.forEach((w) => { if (w.professional) { const p = ensure(w.professional); p.materialQty += Number(w.quantity); p.materialValue += Number(w.unit_cost) * Number(w.quantity); } });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [steps, withdrawals]);

  const fmtHours = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}min`;
  };

  return (
    <section className="panel productivity-panel">
      <div className="panel-heading"><div><h3>Produtividade por Profissional</h3><p>Total de material consumido e horas trabalhadas por colaborador</p></div></div>
      {professionals.length === 0 ? <div className="empty-inline">Nenhuma atividade registrada ainda.</div> : (
        <div className="productivity-list">
          {professionals.map((p) => (
            <div className="productivity-row" key={p.name}>
              <div className="productivity-avatar"><UserCog size={18} /></div>
              <div className="productivity-name"><strong>{p.name}</strong></div>
              <div className="productivity-stat"><Clock size={14} /> <span>{fmtHours(p.minutes)}</span></div>
              <div className="productivity-stat"><Package size={14} /> <span>{p.materialQty} un</span></div>
              <div className="productivity-value">{money(p.materialValue)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
