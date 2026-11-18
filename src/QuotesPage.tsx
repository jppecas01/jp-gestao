import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Company, Quote, formatDate, money } from './types';
import { EmptyState, ModalHeader, PageHeader } from './components';

export function QuotesPage({ companies }: { companies: Company[] }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Quote | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('quotes').select('*').order('quote_date', { ascending: false });
    setQuotes((data as Quote[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return quotes;
    return quotes.filter((c) => `${c.product} ${c.supplier_name} ${c.company} ${c.observations ?? ''}`.toLowerCase().includes(q));
  }, [quotes, search]);

  // best price per product (lowest unit_price)
  const bestPriceByProduct = useMemo(() => {
    const map = new Map<string, number>();
    quotes.forEach((c) => {
      const cur = map.get(c.product);
      if (cur === undefined || Number(c.unit_price) < cur) map.set(c.product, Number(c.unit_price));
    });
    return map;
  }, [quotes]);

  const remove = async (q: Quote) => {
    await supabase.from('quotes').delete().eq('id', q.id);
    setQuotes((cur) => cur.filter((c) => c.id !== q.id));
    setToast('Cotação removida.');
  };

  const onSaved = async () => {
    setCreating(false); setEditing(null);
    setToast('Cotação salva com sucesso.');
    await load();
  };

  return (
    <div className="fade-in">
      <PageHeader eyebrow="COMPRAS / FORNECEDORES" title="Cotações" description="Compare preços por produto e encontre o melhor fornecedor." action={<button className="button button-primary" onClick={() => setCreating(true)}><Plus size={17} /> Nova cotação</button>} />
      <div className="toolbar">
        <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por produto, fornecedor ou empresa..." />{search && <button onClick={() => setSearch('')}><X size={15} /></button>}</div>
      </div>

      {loading ? <div className="loading-state"><div className="loader" /> Carregando cotações...</div> : (
        filtered.length === 0 ? <EmptyState icon={<ShoppingCart />} title="Nenhuma cotação encontrada" text="Cadastre sua primeira cotação para comparar preços." action={() => setCreating(true)} actionLabel="Nova cotação" /> : (
          <div className="table-panel">
            <div className="data-table">
              <div className="table-row table-head quote-table-head">
                <span>Empresa</span><span>Fornecedor</span><span>Data</span><span>Produto</span><span>Qtd.</span><span>Valor unit.</span><span>Valor total</span><span>Obs.</span><span />
              </div>
              {filtered.map((q) => {
                const isBest = bestPriceByProduct.get(q.product) === Number(q.unit_price);
                return (
                  <div className="table-row quote-table-row" key={q.id}>
                    <span><span className="category-tag">{q.company}</span></span>
                    <span className="item-name"><strong>{q.supplier_name}</strong></span>
                    <span>{formatDate(q.quote_date)}</span>
                    <span><strong>{q.product}</strong>{isBest && <span className="best-price-badge">Melhor preço</span>}</span>
                    <span>{Number(q.quantity)}</span>
                    <span className={isBest ? 'text-success' : ''}>{money(Number(q.unit_price))}</span>
                    <span><strong>{money(Number(q.total_price))}</strong></span>
                    <span className="table-observation" title={q.observations ?? ''}>{q.observations || '—'}</span>
                    <span className="row-actions">
                      <button className="more-button" title="Editar" onClick={() => setEditing(q)}><Pencil size={13} /></button>
                      <button className="more-button" title="Excluir" onClick={() => void remove(q)}><Trash2 size={13} /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
      {(creating || editing) && <QuoteForm quote={editing} companies={companies} onClose={() => { setCreating(false); setEditing(null); }} onSaved={onSaved} />}
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  );
}

function QuoteForm({ quote, companies, onClose, onSaved }: { quote: Quote | null; companies: Company[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [qty, setQty] = useState(String(quote?.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState(String(quote?.unit_price ?? 0));
  const total = Number(qty) * Number(unitPrice);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      company: String(form.get('company') ?? 'JP Garagens'),
      supplier_name: String(form.get('supplier_name') ?? ''),
      quote_date: String(form.get('quote_date') ?? new Date().toISOString().slice(0, 10)),
      product: String(form.get('product') ?? ''),
      quantity: Number(qty),
      unit_price: Number(unitPrice),
      total_price: total,
      observations: String(form.get('observations') ?? ''),
    };
    const result = quote ? await supabase.from('quotes').update(payload).eq('id', quote.id) : await supabase.from('quotes').insert(payload);
    setSaving(false);
    if (!result.error) await onSaved();
  };

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={save}>
        <ModalHeader title={quote ? 'Editar cotação' : 'Nova cotação'} onClose={onClose} />
        <div className="form-grid">
          <label>Empresa
            <select name="company" defaultValue={quote?.company ?? 'JP Garagens'}>
              <option>JP Garagens</option><option>JP Autoparts</option>
            </select>
          </label>
          <label>Fornecedor<input name="supplier_name" required defaultValue={quote?.supplier_name ?? ''} placeholder="Nome do fornecedor" /></label>
          <label>Data<input name="quote_date" type="date" required defaultValue={quote?.quote_date ?? new Date().toISOString().slice(0, 10)} /></label>
          <label className="full">Produto<input name="product" required defaultValue={quote?.product ?? ''} placeholder="Nome do produto" /></label>
          <label>Quantidade<input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required /></label>
          <label>Valor unitário (R$)<input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required /></label>
          <label>Valor total<input value={money(total)} disabled /></label>
          <label className="full">Observações<textarea name="observations" rows={2} defaultValue={quote?.observations ?? ''} placeholder="Prazo de entrega, condições de pagamento..." /></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" disabled={saving}><Check size={16} /> {saving ? 'Salvando...' : 'Salvar cotação'}</button>
        </div>
      </form>
    </div>
  );
}
