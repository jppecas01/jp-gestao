import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, Clock, Image as ImageIcon, Package, Plus, Play, Square, Trash2, User, Wrench, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Inventory, MaterialWithdrawal, WorkOrder, WorkOrderPhoto, WorkOrderStep, formatDate, formatDateTime, money, prontuarioStages, serviceSteps } from './types';
import { ModalHeader } from './components';

type OrderDetailProps = {
  order: WorkOrder;
  inventory: Inventory[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
};

export function OrderDetail({ order, inventory, onClose, onRefresh }: OrderDetailProps) {
  const [tab, setTab] = useState<'etapas' | 'material' | 'fotos'>('etapas');
  const [steps, setSteps] = useState<WorkOrderStep[]>([]);
  const [withdrawals, setWithdrawals] = useState<MaterialWithdrawal[]>([]);
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [s, w, p] = await Promise.all([
      supabase.from('work_order_steps').select('*').eq('work_order_id', order.id).order('created_at'),
      supabase.from('material_withdrawals').select('*').eq('work_order_id', order.id).order('withdrawn_at', { ascending: false }),
      supabase.from('work_order_photos').select('*').eq('work_order_id', order.id).order('taken_at', { ascending: false }),
    ]);
    if (s.data) setSteps(s.data as WorkOrderStep[]);
    if (w.data) setWithdrawals(w.data as MaterialWithdrawal[]);
    if (p.data) setPhotos(p.data as WorkOrderPhoto[]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); /* eslint-disable-next-line */ }, [order.id]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); } }, [toast]);

  const getStep = (stage: string) => steps.find((s) => s.stage === stage);

  const startStep = async (stage: string, professional: string) => {
    setSaving(true);
    const existing = getStep(stage);
    if (existing && existing.started_at && !existing.finished_at) {
      // finish
      const minutes = existing.minutes_worked + Math.round((Date.now() - new Date(existing.started_at).getTime()) / 60000);
      await supabase.from('work_order_steps').update({ finished_at: new Date().toISOString(), minutes_worked: minutes, professional }).eq('id', existing.id);
      setToast(`Etapa ${stage} finalizada. ${minutes} min registrados.`);
    } else if (existing) {
      // restart
      await supabase.from('work_order_steps').update({ started_at: new Date().toISOString(), finished_at: null, professional }).eq('id', existing.id);
      setToast(`Etapa ${stage} iniciada.`);
    } else {
      await supabase.from('work_order_steps').insert({ work_order_id: order.id, stage, professional, started_at: new Date().toISOString(), minutes_worked: 0 });
      setToast(`Etapa ${stage} iniciada.`);
    }
    setSaving(false);
    await loadData(); await onRefresh();
  };

  const saveManualMinutes = async (stage: string, professional: string, minutes: number) => {
    setSaving(true);
    const existing = getStep(stage);
    if (existing) {
      await supabase.from('work_order_steps').update({ minutes_worked: minutes, professional }).eq('id', existing.id);
    } else {
      await supabase.from('work_order_steps').insert({ work_order_id: order.id, stage, professional, minutes_worked: minutes });
    }
    setSaving(false);
    setToast(`Horas manuais salvas para ${stage}.`);
    await loadData(); await onRefresh();
  };

  return (
    <div className="modal-backdrop form-backdrop">
      <div className="order-detail-modal">
        <div className="form-topbar">
          <div>
            <div className="eyebrow">PRONTUÁRIO DA OS</div>
            <h2>{order.code} · {order.vehicle}</h2>
            <p>{order.customer} · Placa {order.plate} · {formatDate(order.entry_date)}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="order-detail-tabs">
          <button className={tab === 'etapas' ? 'selected' : ''} onClick={() => setTab('etapas')}><Wrench size={15} /> Profissional e Etapas</button>
          <button className={tab === 'material' ? 'selected' : ''} onClick={() => setTab('material')}><Package size={15} /> Retiradas de Material</button>
          <button className={tab === 'fotos' ? 'selected' : ''} onClick={() => setTab('fotos')}><Camera size={15} /> Fotos do Andamento</button>
        </div>

        <div className="order-detail-body">
          {loading ? <div className="loading-state"><div className="loader" /> Carregando prontuário...</div> : <>
            {tab === 'etapas' && <StepsTab steps={steps} serviceSteps={serviceSteps} saving={saving} onStart={startStep} onSaveManual={saveManualMinutes} />}
            {tab === 'material' && <MaterialTab order={order} inventory={inventory} withdrawals={withdrawals} onRefresh={loadData} onToast={setToast} />}
            {tab === 'fotos' && <PhotosTab order={order} photos={photos} onRefresh={loadData} onToast={setToast} />}
          </>}
        </div>
        {toast && <div className="toast"><Package size={17} /> {toast}</div>}
      </div>
    </div>
  );
}

function StepsTab({ steps, serviceSteps, saving, onStart, onSaveManual }: { steps: WorkOrderStep[]; serviceSteps: string[]; saving: boolean; onStart: (stage: string, prof: string) => Promise<void>; onSaveManual: (stage: string, prof: string, minutes: number) => Promise<void> }) {
  const [profValues, setProfValues] = useState<Record<string, string>>({});
  const [minValues, setMinValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const prof: Record<string, string> = {};
    const min: Record<string, string> = {};
    serviceSteps.forEach((st) => { const s = steps.find((x) => x.stage === st); prof[st] = s?.professional ?? ''; min[st] = s ? String(s.minutes_worked) : '0'; });
    setProfValues(prof); setMinValues(min);
  }, [steps]);

  return (
    <div className="steps-list">
      {serviceSteps.map((stage, idx) => {
        const step = steps.find((s) => s.stage === stage);
        const active = step?.started_at && !step?.finished_at;
        return (
          <div className={`step-card ${active ? 'step-active' : ''}`} key={stage}>
            <div className="step-header">
              <span className="step-number">0{idx + 1}</span>
              <strong>{stage}</strong>
              {active && <span className="step-running"><span className="pulse-dot" /> Em execução</span>}
              {step?.finished_at && <span className="step-done">Concluída · {step.minutes_worked} min</span>}
            </div>
            <div className="step-fields">
              <label>Profissional responsável
                <div className="login-input-wrapper"><User size={15} /><input value={profValues[stage] ?? ''} onChange={(e) => setProfValues({ ...profValues, [stage]: e.target.value })} placeholder="Nome do profissional" /></div>
              </label>
              <label>Minutos trabalhados
                <div className="login-input-wrapper"><Clock size={15} /><input type="number" min="0" value={minValues[stage] ?? '0'} onChange={(e) => setMinValues({ ...minValues, [stage]: e.target.value })} /></div>
              </label>
            </div>
            <div className="step-actions">
              <button className="button button-primary small" disabled={saving} onClick={() => onStart(stage, profValues[stage] ?? '')}>
                {active ? <><Square size={14} /> Finalizar Etapa</> : <><Play size={14} /> Iniciar Etapa</>}
              </button>
              <button className="button button-secondary small" disabled={saving} onClick={() => onSaveManual(stage, profValues[stage] ?? '', Number(minValues[stage] ?? 0))}>
                Lançar Horas Manual
              </button>
              {step?.started_at && <span className="step-time">Início: {formatDateTime(step.started_at)}</span>}
              {step?.finished_at && <span className="step-time">Fim: {formatDateTime(step.finished_at)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MaterialTab({ order, inventory, withdrawals, onRefresh, onToast }: { order: WorkOrder; inventory: Inventory[]; withdrawals: MaterialWithdrawal[]; onRefresh: () => Promise<void>; onToast: (msg: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [prof, setProf] = useState('');
  const [stageSel, setStageSel] = useState(serviceSteps[0]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');

  const product = inventory.find((i) => i.id === productId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product) { onToast('Selecione um produto.'); return; }
    const quantity = Number(qty);
    if (quantity <= 0) { onToast('Quantidade inválida.'); return; }
    const { error } = await supabase.from('material_withdrawals').insert({
      work_order_id: order.id, inventory_item_id: product.id, professional: prof, stage: stageSel,
      product_name: product.name, quantity, unit_cost: Number(product.cost), withdrawn_at: new Date().toISOString(),
    });
    if (error) { onToast('Erro ao registrar retirada.'); return; }
    // decrement stock
    await supabase.from('inventory_items').update({ stock: Math.max(0, product.stock - quantity) }).eq('id', product.id);
    onToast(`Retirada registrada: ${quantity} ${product.unit} de ${product.name}.`);
    setShowForm(false); setProductId(''); setQty('1');
    await onRefresh();
  };

  const remove = async (w: MaterialWithdrawal) => {
    // restore stock
    if (w.inventory_item_id) {
      const item = inventory.find((i) => i.id === w.inventory_item_id);
      if (item) await supabase.from('inventory_items').update({ stock: item.stock + Number(w.quantity) }).eq('id', item.id);
    }
    await supabase.from('material_withdrawals').delete().eq('id', w.id);
    onToast('Retirada removida. Estoque restaurado.');
    await onRefresh();
  };

  return (
    <div className="material-tab">
      <div className="material-toolbar">
        <div><strong>Comanda de Retiradas Parciais</strong><span>Histórico de materiais retirados para esta OS</span></div>
        <button className="button button-primary small" onClick={() => setShowForm(!showForm)}><Plus size={15} /> Retirar Material</button>
      </div>
      {showForm && (
        <form className="withdrawal-form" onSubmit={submit}>
          <label>Profissional<input value={prof} onChange={(e) => setProf(e.target.value)} placeholder="Nome do profissional" required /></label>
          <label>Etapa
            <select value={stageSel} onChange={(e) => setStageSel(e.target.value)}>{serviceSteps.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label>Produto
            <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">Selecionar produto</option>
              {inventory.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit})</option>)}
            </select>
          </label>
          <label>Quantidade<input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required /></label>
          <label>Custo unit.<input value={product ? money(product.cost) : '—'} disabled /></label>
          <button className="button button-primary" type="submit">Registrar</button>
        </form>
      )}
      <div className="withdrawals-list">
        {withdrawals.length === 0 ? <div className="empty-inline">Nenhuma retirada registrada ainda.</div> : withdrawals.map((w) => (
          <div className="withdrawal-row" key={w.id}>
            <div className="withdrawal-icon"><Package size={16} /></div>
            <div className="withdrawal-info"><strong>{w.product_name}</strong><span>{w.professional ?? 'Sem profissional'} · {w.stage ?? 'Sem etapa'}</span></div>
            <div className="withdrawal-qty">{Number(w.quantity)} un</div>
            <div className="withdrawal-cost">{money(Number(w.unit_cost) * Number(w.quantity))}</div>
            <div className="withdrawal-date">{formatDateTime(w.withdrawn_at)}</div>
            <button className="remove-line" title="Remover" onClick={() => void remove(w)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotosTab({ order, photos, onRefresh, onToast }: { order: WorkOrder; photos: WorkOrderPhoto[]; onRefresh: () => Promise<void>; onToast: (msg: string) => void }) {
  const [stageSel, setStageSel] = useState(prontuarioStages[0]);
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const photo_url = String(reader.result);
      const { error } = await supabase.from('work_order_photos').insert({
        work_order_id: order.id, stage: stageSel, photo_url, caption, taken_at: new Date().toISOString(),
      });
      if (error) { onToast('Erro ao enviar foto.'); return; }
      onToast('Foto adicionada.');
      setCaption('');
      await onRefresh();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = async (p: WorkOrderPhoto) => {
    await supabase.from('work_order_photos').delete().eq('id', p.id);
    onToast('Foto removida.');
    await onRefresh();
  };

  return (
    <div className="photos-tab">
      <div className="photo-upload-bar">
        <label>Etapa<select value={stageSel} onChange={(e) => setStageSel(e.target.value)}>{prontuarioStages.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Legenda<input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex.: Lateral direita após preparação" /></label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden-file-input" onChange={handleFile} />
        <button className="button button-primary" type="button" onClick={() => fileRef.current?.click()}><Camera size={15} /> Anexar Foto</button>
      </div>
      {prontuarioStages.map((stage) => {
        const stagePhotos = photos.filter((p) => p.stage === stage);
        return (
          <div className="photo-stage-group" key={stage}>
            <div className="photo-stage-header"><Camera size={15} /> <strong>{stage}</strong> <span>{stagePhotos.length} foto(s)</span></div>
            {stagePhotos.length === 0 ? <div className="empty-inline small">Nenhuma foto nesta etapa.</div> : (
              <div className="photo-gallery">
                {stagePhotos.map((p) => (
                  <div className="photo-thumb" key={p.id}>
                    <img src={p.photo_url} alt={p.caption ?? stage} />
                    <div className="photo-overlay">
                      <button onClick={() => void removePhoto(p)}><Trash2 size={13} /></button>
                    </div>
                    {p.caption && <div className="photo-caption">{p.caption}</div>}
                    <div className="photo-date">{formatDateTime(p.taken_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {photos.length === 0 && <div className="empty-state"><div className="empty-icon"><ImageIcon /></div><h3>Sem fotos ainda</h3><p>Anexe fotos do serviço em cada etapa.</p></div>}
    </div>
  );
}

