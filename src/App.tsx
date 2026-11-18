import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Bell, Building2, Car, Check, ChevronDown,
  ClipboardList, CreditCard, FileText, Gauge, LayoutDashboard, LogOut, Menu, Package, Plus,
  Printer, Search, Settings, ShoppingCart, Users, X, Wrench, CircleDollarSign, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Budget, BudgetItem, Company, Customer, Inventory, MaterialWithdrawal, Preferences,
  View, WorkOrder, WorkOrderStep, formatDate, money, statuses,
} from './types';
import { NavItem, PageHeader, Metric, Activity, Quick, StatusBadge, EmptyState, ModalHeader, SectionTitle, ConfirmDialog, viewLabel } from './components';
import { LoginScreen } from './Login';
import { OrderDetail } from './OrderDetail';
import { OrdersPage } from './OrdersPage';
import { QuotesPage } from './QuotesPage';
import { UsersSettings } from './UsersSettings';
import { ProductivityPanel } from './ProductivityPanel';
import { clearSessionUser, getSessionUser } from './auth';

function App() {
  const [session, setSession] = useState(getSessionUser());
  const [view, setView] = useState<View>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('all');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [nextBudgetCode, setNextBudgetCode] = useState('');
  const [allSteps, setAllSteps] = useState<WorkOrderStep[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<MaterialWithdrawal[]>([]);

  const migrateLocalData = async () => {
    const savedCompanies = JSON.parse(localStorage.getItem('jp-company-settings') ?? '{}') as Record<string, Partial<Company>>;
    const savedLogos = JSON.parse(localStorage.getItem('jp-company-logos') ?? '{}') as Record<string, string>;
    for (const [id, company] of Object.entries(savedCompanies)) await supabase.from('companies').update({ name: company.name, legal_name: company.legal_name, cnpj: company.cnpj, address: company.address, phone: company.phone, email: company.email }).eq('id', id);
    for (const [id, logo] of Object.entries(savedLogos)) await supabase.from('companies').update({ logo_url: logo }).eq('id', id);
    const savedCustomers = JSON.parse(localStorage.getItem('jp-customers') ?? '[]') as Customer[];
    if (savedCustomers.length) {
      for (const customer of savedCustomers) await supabase.from('customers').insert({ name: customer.name, document: customer.document, address: customer.address, observations: customer.observations, phone: customer.phone, email: customer.email });
      localStorage.removeItem('jp-customers');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await migrateLocalData();
    const [companyResult, budgetResult, itemResult, inventoryResult, customerResult, orderResult, prefResult, stepsResult, withdrawalsResult] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('budgets').select('*, customers(*)').order('created_at', { ascending: false }),
      supabase.from('budget_items').select('*'),
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('work_orders').select('*, customers(name), budgets(vehicle_model, vehicle_plate)').order('created_at', { ascending: false }),
      supabase.from('workspace_preferences').select('*').eq('id', 'default').maybeSingle(),
      supabase.from('work_order_steps').select('*'),
      supabase.from('material_withdrawals').select('*'),
    ]);
    if (companyResult.data) setCompanies(companyResult.data as Company[]);
    if (budgetResult.data) {
      const items = (itemResult.data ?? []) as BudgetItem[];
      setBudgets((budgetResult.data as Budget[]).map((budget) => ({ ...budget, items: items.filter((item) => item.budget_id === budget.id) })));
    }
    if (inventoryResult.data) setInventory(inventoryResult.data as Inventory[]);
    if (customerResult.data) setCustomers(customerResult.data as Customer[]);
    if (orderResult.data) setOrders(orderResult.data.map((item: any) => ({ id: item.id, code: item.code, stage: item.stage, total: item.total, entry_date: item.entry_date, vehicle: item.budgets?.vehicle_model ?? 'Veículo', plate: item.budgets?.vehicle_plate ?? '—', customer: item.customers?.name ?? 'Cliente', budget_id: item.budget_id })));
    if (prefResult.data) setPreferences(prefResult.data as Preferences);
    if (stepsResult.data) setAllSteps(stepsResult.data as WorkOrderStep[]);
    if (withdrawalsResult.data) setAllWithdrawals(withdrawalsResult.data as MaterialWithdrawal[]);
    setLoading(false);
  };

  useEffect(() => { if (session) void loadData(); }, [session]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); } }, [toast]);

  const logout = () => { clearSessionUser(); setSession(null); };

  if (!session) return <LoginScreen onSuccess={(u) => setSession(u)} />;

  const currentCompany = companies.find((company) => company.id === companyId);
  const updateBudgetStatus = async (budget: Budget, nextStatus: string) => {
    const { error } = await supabase.from('budgets').update({ status: nextStatus }).eq('id', budget.id);
    if (error) { setToast('Não foi possível atualizar o status.'); return; }
    setToast(`Orçamento ${budget.code} marcado como ${nextStatus}.`);
    setSelectedBudget(null);
    await loadData();
  };
  const deleteBudget = async (budget: Budget) => {
    const { error } = await supabase.from('budgets').delete().eq('id', budget.id);
    if (error) { setToast('Não foi possível excluir o orçamento.'); return; }
    setBudgets((current) => current.filter((item) => item.id !== budget.id));
    const deleted = JSON.parse(localStorage.getItem('jp-deleted-budgets') ?? '[]') as string[];
    localStorage.setItem('jp-deleted-budgets', JSON.stringify([...new Set([...deleted, budget.id])]));
    setPendingDelete(null);
    setToast('Orçamento excluído.');
  };
  const scopedBudgets = useMemo(() => budgets.filter((budget) => companyId === 'all' || budget.company_id === companyId), [budgets, companyId]);
  const scopedOrders = useMemo(() => orders.filter((order) => { const ob = budgets.find((b) => b.code === order.code.replace('OS.', 'OR.')); return companyId === 'all' || ob?.company_id === companyId; }), [orders, budgets, companyId]);
  const scopedInventory = useMemo(() => inventory.filter((item) => companyId === 'all' || item.company_id === companyId), [inventory, companyId]);
  const filteredBudgets = scopedBudgets.filter((budget) => {
    const text = `${budget.code} ${budget.vehicle_model ?? ''} ${budget.vehicle_plate ?? ''} ${budget.customers?.name ?? ''}`.toLowerCase();
    return (status === 'Todos' || budget.status === status) && text.includes(search.toLowerCase());
  });
  const revenue = scopedBudgets.filter((budget) => ['Aceito', 'Execução', 'Concluído'].includes(budget.status)).reduce((sum, budget) => sum + Number(budget.total), 0);
  const lowStockItems = inventory.filter((item) => item.stock <= item.minimum_stock);
  const staleBudgets = budgets.filter((budget) => {
    if (budget.status !== 'Em aberto') return false;
    const ageDays = (Date.now() - new Date(`${budget.budget_date}T12:00:00`).getTime()) / 86400000;
    return ageDays > (preferences?.stale_budget_days ?? 5);
  });
  const alertCount = (preferences?.low_stock_alerts ? lowStockItems.length : 0) + (preferences?.stale_budget_alerts ? staleBudgets.length : 0);

  const navigate = (nextView: View) => { setView(nextView); setMobileNav(false); setSelectedBudget(null); };
  const openBudgetForm = (budget: Budget | null) => {
    setEditingBudget(budget);
    setShowBudgetForm(true);
    if (!budget) {
      const maxNum = budgets.reduce((max, b) => { const n = parseInt(b.code.replace(/\D/g, ''), 10); return isNaN(n) ? max : Math.max(max, n); }, 0);
      setNextBudgetCode(`OR.${String(maxNum + 1).padStart(4, '0')}`);
    }
  };
  const approveBudget = async (budget: Budget) => {
    const company = companies.find((item) => item.id === budget.company_id);
    const { error: budgetError } = await supabase.from('budgets').update({ status: 'Aceito' }).eq('id', budget.id);
    if (budgetError) { setToast('Não foi possível aprovar o orçamento.'); return; }
    const { data: existing } = await supabase.from('work_orders').select('id').eq('budget_id', budget.id).maybeSingle();
    if (!existing) {
      const orderCode = budget.code.replace('OR.', 'OS.');
      await supabase.from('work_orders').insert({ budget_id: budget.id, company_id: budget.company_id, customer_id: budget.customer_id, code: orderCode, total: budget.total, stage: 'Aguardando entrada', entry_date: new Date().toISOString().slice(0, 10) });
      await supabase.from('finance_entries').insert({ company_id: budget.company_id, description: `${orderCode} · ${budget.vehicle_model ?? 'Serviço'}`, amount: budget.total, status: 'Pendente', entry_type: 'Receita' });
    }
    setToast(`Orçamento aprovado${company ? ` para ${company.name}` : ''}. OS e financeiro atualizados.`);
    setSelectedBudget(null); await loadData();
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Gauge size={20} /></div><div><strong>JP Gestão</strong><span>Operação inteligente</span></div><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">GRUPO JP</div>
        <nav>
          <NavItem icon={<LayoutDashboard size={18} />} label="Início" active={view === 'dashboard'} onClick={() => navigate('dashboard')} />
          <div className="nav-section">OPERAÇÃO</div>
          <NavItem icon={<FileText size={18} />} label="Orçamentos" active={view === 'budgets'} count={scopedBudgets.length} onClick={() => navigate('budgets')} />
          <NavItem icon={<Wrench size={18} />} label="Ordens de serviço" active={view === 'orders'} onClick={() => navigate('orders')} />
          <NavItem icon={<Package size={18} />} label="Estoque unificado" active={view === 'inventory'} onClick={() => navigate('inventory')} />
          <NavItem icon={<ShoppingCart size={18} />} label="Cotações" active={view === 'quotes'} onClick={() => navigate('quotes')} />
          <NavItem icon={<Users size={18} />} label="Clientes" active={view === 'customers'} onClick={() => navigate('customers')} />
          <div className="nav-section">GESTÃO</div>
          <NavItem icon={<CircleDollarSign size={18} />} label="Financeiro" active={view === 'finance'} onClick={() => navigate('finance')} />
          <NavItem icon={<Settings size={18} />} label="Configurações" active={view === 'settings'} onClick={() => navigate('settings')} />
        </nav>
        <div className="sidebar-footer">
          <div className="support-card"><span className="status-dot" /> Operação sincronizada<div className="muted">Dados atualizados agora</div></div>
          <div className="user-chip"><div className="avatar">{session.name.slice(0, 2).toUpperCase()}</div><div><strong>{session.name}</strong><span>{session.email}</span></div></div>
          <button className="logout-button" onClick={logout}><LogOut size={15} /> Sair</button>
        </div>
      </aside>
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Fechar menu" />}
      <main className="main-content">
        <header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{viewLabel(view)}</strong></div><div className="top-actions"><div className="bell-wrapper"><button className={`icon-button ${alertCount ? 'has-alerts' : ''}`} onClick={() => setShowNotifications(!showNotifications)}><Bell size={18} />{alertCount > 0 && <i>{alertCount}</i>}</button>{showNotifications && <><div className="notification-overlay" onClick={() => setShowNotifications(false)} /><div className="notification-dropdown"><div className="notification-header"><strong>Notificações</strong><button onClick={() => setShowNotifications(false)}><X size={15} /></button></div>{alertCount === 0 ? <div className="notification-empty">Tudo em dia — nenhum alerta ativo.</div> : <>{(preferences?.low_stock_alerts && lowStockItems.length > 0) && <div className="notification-section"><span className="notification-label">Estoque baixo</span>{lowStockItems.map((item) => <div className="notification-item" key={item.id}><Package size={15} /><div><strong>{item.name}</strong><span>{item.stock} {item.unit} · mínimo {item.minimum_stock}</span></div></div>)}</div>}{(preferences?.stale_budget_alerts && staleBudgets.length > 0) && <div className="notification-section"><span className="notification-label">Orçamentos parados</span>{staleBudgets.map((budget) => <div className="notification-item" key={budget.id}><FileText size={15} /><div><strong>{budget.code}</strong><span>{budget.customers?.name ?? 'Sem cliente'} · {budget.vehicle_model ?? 'Sem veículo'}</span></div></div>)}</div>}</>}</div></>}</div><div className="company-select"><Building2 size={17} /><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="all">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><ChevronDown size={15} /></div><div className="avatar avatar-top">{session.name.slice(0, 2).toUpperCase()}</div></div></header>
        <div className="page-content">
          {loading ? <div className="loading-state"><div className="loader" /> Carregando seu workspace...</div> : <>
            {view === 'dashboard' && <Dashboard revenue={revenue} budgets={scopedBudgets} inventory={scopedInventory} orders={scopedOrders} companyId={companyId} onNavigate={navigate} steps={allSteps} withdrawals={allWithdrawals} />}
            {view === 'budgets' && <BudgetsPage budgets={filteredBudgets} search={search} setSearch={setSearch} status={status} setStatus={setStatus} onNew={() => openBudgetForm(null)} onSelect={setSelectedBudget} onEdit={(budget) => openBudgetForm(budget)} onStatus={updateBudgetStatus} onApprove={approveBudget} onDelete={(budget) => setPendingDelete(budget)} />}
            {view === 'orders' && <OrdersPage orders={scopedOrders} onUpdate={loadData} onSelect={setSelectedOrder} />}
            {view === 'inventory' && <InventoryPage inventory={scopedInventory} companies={companies} onRefresh={loadData} />}
            {view === 'quotes' && <QuotesPage companies={companies} />}
            {view === 'customers' && <CustomersPage customers={customers} companyId={companyId} companies={companies} onSaved={loadData} />}
            {view === 'finance' && <FinancePage budgets={scopedBudgets} />}
            {view === 'settings' && <SettingsPage companies={companies} onCompaniesChange={setCompanies} preferences={preferences} onPreferencesChange={setPreferences} />}
          </>}
        </div>
      </main>
      {showBudgetForm && <BudgetForm budget={editingBudget} companies={companies} customers={customers} inventory={inventory} selectedCompanyId={companyId === 'all' ? companies[0]?.id ?? '' : companyId} preferences={preferences} nextBudgetCode={nextBudgetCode} onClose={() => { setShowBudgetForm(false); setEditingBudget(null); }} onSaved={async () => { setShowBudgetForm(false); setEditingBudget(null); setToast('Orçamento salvo com sucesso.'); await loadData(); }} />}
      {pendingDelete && <ConfirmDialog icon={<Trash2 size={22} />} title="Excluir orçamento?" message={`O orçamento ${pendingDelete.code} será removido definitivamente.`} confirmLabel="Excluir orçamento" onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteBudget(pendingDelete)} />}
      {selectedBudget && <BudgetPreview budget={selectedBudget} company={companies.find((item) => item.id === selectedBudget.company_id)} onClose={() => setSelectedBudget(null)} onEdit={() => { setEditingBudget(selectedBudget); setSelectedBudget(null); setShowBudgetForm(true); }} onStatus={async (nextStatus) => { await updateBudgetStatus(selectedBudget, nextStatus); }} onApprove={() => approveBudget(selectedBudget)} />}
      {selectedOrder && <OrderDetail order={selectedOrder} inventory={inventory} onClose={() => setSelectedOrder(null)} onRefresh={loadData} />}
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  );
}

function Dashboard({ revenue, budgets, inventory, orders, companyId, onNavigate, steps, withdrawals }: { revenue: number; budgets: Budget[]; inventory: Inventory[]; orders: WorkOrder[]; companyId: string; onNavigate: (view: View) => void; steps: WorkOrderStep[]; withdrawals: MaterialWithdrawal[] }) {
  const open = budgets.filter((budget) => budget.status === 'Em aberto').length;
  const lowStock = inventory.filter((item) => item.stock <= item.minimum_stock).length;
  const activeOrders = orders.filter((order) => order.stage !== 'Entregue').length;
  return <div className="fade-in"><PageHeader eyebrow="VISÃO GERAL" title="Bom dia, equipe JP" description="Acompanhe a operação das suas empresas em um só lugar." action={<button className="button button-primary" onClick={() => onNavigate('budgets')}><Plus size={17} /> Novo orçamento</button>} />
    <div className="metric-grid"><Metric title="Faturamento no período" value={money(revenue)} trend="12,8%" positive icon={<CircleDollarSign size={20} />} /><Metric title="Orçamentos aprovados" value={String(budgets.filter((budget) => budget.status !== 'Em aberto' && budget.status !== 'Rejeitado').length).padStart(2, '0')} trend="8,2%" positive icon={<FileText size={20} />} /><Metric title="OS em andamento" value={String(activeOrders).padStart(2, '0')} trend="3 veículos" icon={<Wrench size={20} />} /><Metric title="Itens em estoque mínimo" value={String(lowStock).padStart(2, '0')} trend={lowStock ? 'Atenção' : 'Tudo certo'} warning={lowStock > 0} icon={<Package size={20} />} /></div>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>Desempenho financeiro</h3><p>Receitas previstas por período</p></div><select className="small-select"><option>Últimos 30 dias</option><option>Últimos 7 dias</option></select></div><div className="chart"><div className="chart-y"><span>R$ 8k</span><span>R$ 6k</span><span>R$ 4k</span><span>R$ 2k</span><span>R$ 0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 600 190" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0a4d3c" stopOpacity=".22" /><stop offset="100%" stopColor="#0a4d3c" stopOpacity="0" /></linearGradient></defs><path d="M0 155 C55 140 55 115 110 128 S160 145 205 90 S260 116 300 105 S350 52 400 75 S450 82 500 38 S550 75 600 24 L600 190 L0 190 Z" fill="url(#fill)" /><path d="M0 155 C55 140 55 115 110 128 S160 145 205 90 S260 116 300 105 S350 52 400 75 S450 82 500 38 S550 75 600 24" fill="none" stroke="#0a4d3c" strokeWidth="3" /></svg><div className="chart-x"><span>01 Mai</span><span>08 Mai</span><span>15 Mai</span><span>22 Mai</span><span>Hoje</span></div></div></div></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><h3>Atividade recente</h3><p>Últimas movimentações</p></div><button className="text-button" onClick={() => onNavigate('budgets')}>Ver tudo</button></div><Activity icon={<FileText size={16} />} title="Orçamento OR.0002 aprovado" detail="Volkswagen Constellation · hoje" value={money(5750)} /><Activity icon={<Wrench size={16} />} title="OS.0002 entrou em pintura" detail="JP Garagens · ontem" value="Em execução" /><Activity icon={<Package size={16} />} title="Estoque atualizado" detail="Tinta PU Branco · há 2 dias" value="- 2,0 L" /></section>
    </div>
    <ProductivityPanel steps={steps} withdrawals={withdrawals} />
    <section className="panel quick-panel"><div className="panel-heading"><div><h3>Operação rápida</h3><p>Acesse as áreas mais usadas</p></div></div><div className="quick-actions"><Quick icon={<FileText />} title="Criar orçamento" text="Monte uma nova proposta" onClick={() => onNavigate('budgets')} /><Quick icon={<Wrench />} title="Ver pátio" text="Acompanhe as OS" onClick={() => onNavigate('orders')} /><Quick icon={<ShoppingCart />} title="Consultar estoque" text="Peças e insumos" onClick={() => onNavigate('inventory')} /><Quick icon={<BarChart3 />} title="Ver financeiro" text="Receitas e pendências" onClick={() => onNavigate('finance')} /></div></section>
  </div>;
}

function BudgetsPage({ budgets, search, setSearch, status, setStatus, onNew, onSelect, onEdit, onStatus, onApprove, onDelete }: { budgets: Budget[]; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; onNew: () => void; onSelect: (budget: Budget) => void; onEdit: (budget: Budget) => void; onStatus: (budget: Budget, status: string) => Promise<void>; onApprove: (budget: Budget) => Promise<void>; onDelete: (budget: Budget) => void | Promise<void> }) {
  return <div className="fade-in"><PageHeader eyebrow="OPERAÇÃO / DOCUMENTOS" title="Orçamentos" description="Crie propostas claras e acompanhe cada oportunidade." action={<button className="button button-primary" onClick={onNew}><Plus size={17} /> Novo orçamento</button>} /><div className="toolbar"><div className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cliente, veículo ou código" />{search && <button onClick={() => setSearch('')}><X size={15} /></button>}</div><button className="button button-secondary"><BarChart3 size={16} /> Exportar</button></div><div className="tabs">{statuses.map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item}<small>{item === 'Todos' ? budgets.length : budgets.filter((budget) => budget.status === item).length}</small></button>)}</div><div className="budget-grid">{budgets.map((budget) => <BudgetCard key={budget.id} budget={budget} onClick={() => onSelect(budget)} onEdit={() => onEdit(budget)} onReview={() => onStatus(budget, 'Revisar')} onApprove={() => onApprove(budget)} onReject={() => onStatus(budget, 'Rejeitado')} onDelete={() => onDelete(budget)} />)}{budgets.length === 0 && <EmptyState icon={<FileText />} title="Nenhum orçamento encontrado" text="Ajuste os filtros ou crie sua primeira proposta." action={onNew} actionLabel="Novo orçamento" />}</div></div>;
}

function BudgetCard({ budget, onClick, onEdit, onReview, onApprove, onReject, onDelete }: { budget: Budget; onClick: () => void; onEdit: () => void; onReview: () => void; onApprove: () => void; onReject: () => void; onDelete: () => void }) {
  return <div className="budget-card"><button className="card-main" onClick={onClick}><div className="card-top"><span className="code">{budget.code}</span><StatusBadge status={budget.status} /></div><div className="budget-vehicle"><Car size={17} /><strong>{budget.vehicle_model || 'Veículo não informado'}</strong><span>{budget.vehicle_plate || 'Sem placa'}</span></div><div className="budget-customer">{budget.customers?.name || 'Cliente não informado'}</div><div className="card-bottom"><span>{formatDate(budget.budget_date)}</span><strong>{money(Number(budget.total))}</strong></div></button><div className="card-actions"><button title="Visualizar / PDF" onClick={onClick}><FileText size={13} /></button><button title="Editar" onClick={onEdit}><Settings size={13} /></button><button title="Marcar para revisão" onClick={onReview}><ClipboardList size={13} /></button><button title="Aprovar" className="action-positive" onClick={onApprove}><Check size={13} /></button><button title="Reprovar" className="action-negative" onClick={onReject}><X size={13} /></button><button title="Excluir" className="action-negative" onClick={onDelete}><Trash2 size={13} /></button></div></div>;
}

function InventoryPage({ inventory: initialInventory, companies, onRefresh }: { inventory: Inventory[]; companies: Company[]; onRefresh: () => Promise<void> }) {
  const [inventory, setInventory] = useState(initialInventory);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [filter, setFilter] = useState('Todos');
  const visible = inventory.filter((item) => filter === 'Todos' || item.category === filter);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get('name') ?? ''), category: String(form.get('category') ?? 'Peças'), unit: String(form.get('unit') ?? 'un'), stock: Number(form.get('stock') ?? 0), minimum_stock: Number(form.get('minimum_stock') ?? 0), cost: Number(form.get('cost') ?? 0), sale_price: Number(form.get('sale_price') ?? 0), observations: String(form.get('observations') ?? ''), company_id: String(form.get('company_id') ?? '') || null };
    const result = editing?.id ? await supabase.from('inventory_items').update(payload).eq('id', editing.id) : await supabase.from('inventory_items').insert(payload);
    if (!result.error) { setEditing(null); await onRefresh(); setInventory((await supabase.from('inventory_items').select('*').order('name')).data as Inventory[] ?? []); }
  };
  return <div className="fade-in"><PageHeader eyebrow="OPERAÇÃO / SUPRIMENTOS" title="Estoque unificado" description="Peças, insumos e alertas das duas empresas em um único catálogo." action={<button className="button button-primary" onClick={() => setEditing({ id: '', company_id: companies[0]?.id ?? null, name: '', category: 'Peças', unit: 'un', stock: 0, minimum_stock: 0, cost: 0, sale_price: 0, observations: '' })}><Plus size={17} /> Novo item</button>} /><div className="inventory-summary"><div><Package size={19} /><span>Itens cadastrados</span><strong>{inventory.length}</strong></div><div><ArrowDownRight size={19} /><span>Estoque baixo</span><strong className="text-warning">{inventory.filter((item) => item.stock <= item.minimum_stock).length}</strong></div><div><CircleDollarSign size={19} /><span>Valor em estoque</span><strong>{money(inventory.reduce((sum, item) => sum + item.stock * item.cost, 0))}</strong></div></div><div className="table-panel"><div className="table-toolbar"><div className="tabs compact">{['Todos', 'Peças', 'Funilaria e pintura'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><span className="muted">Observações aparecem na linha do item</span></div><div className="data-table"><div className="table-row table-head"><span>Item</span><span>Empresa</span><span>Categoria</span><span>Estoque</span><span>Observações</span><span /></div>{visible.map((item) => <div className="table-row" key={item.id}><span className="item-name"><span className="item-icon"><Package size={16} /></span><strong>{item.name}</strong></span><span>{companies.find((company) => company.id === item.company_id)?.name ?? 'Grupo JP'}</span><span><span className="category-tag">{item.category}</span></span><span className={item.stock <= item.minimum_stock ? 'stock-low' : ''}>{item.stock} {item.unit}{item.stock <= item.minimum_stock && <small> reposição</small>}</span><span className="table-observation" title={item.observations ?? ''}>{item.observations || '—'}</span><span><button className="more-button" onClick={() => setEditing(item)}>Editar</button></span></div>)}</div></div>{editing && <div className="modal-backdrop"><form className="modal-card" onSubmit={save}><ModalHeader title={editing.id ? 'Editar item de estoque' : 'Novo item de estoque'} onClose={() => setEditing(null)} /><div className="form-grid"><label className="full">Nome do item<input name="name" required defaultValue={editing.name} placeholder="Ex.: Tinta PU Branco" /></label><label>Empresa<select name="company_id" defaultValue={editing.company_id ?? companies[0]?.id}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label>Categoria<select name="category" defaultValue={editing.category}><option>Peças</option><option>Funilaria e pintura</option></select></label><label>Unidade<input name="unit" defaultValue={editing.unit} /></label><label>Estoque atual<input name="stock" type="number" step="0.01" defaultValue={editing.stock} /></label><label>Estoque mínimo<input name="minimum_stock" type="number" step="0.01" defaultValue={editing.minimum_stock} /></label><label>Custo<input name="cost" type="number" step="0.01" defaultValue={editing.cost} /></label><label>Preço de venda<input name="sale_price" type="number" step="0.01" defaultValue={editing.sale_price} /></label><label className="full">Observações<textarea name="observations" rows={3} defaultValue={editing.observations ?? ''} placeholder="Código original, fornecedor, marca da tinta..." /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-primary"><Check size={16} /> Salvar item</button></div></form></div>}</div>;
}

function CustomersPage({ customers: initialCustomers, companyId, companies, onSaved }: { customers: Customer[]; companyId: string; companies: Company[]; onSaved: () => Promise<void> }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [toast, setToast] = useState('');
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get('name') ?? ''), document: String(form.get('document') ?? ''), address: String(form.get('address') ?? ''), observations: String(form.get('observations') ?? ''), phone: String(form.get('phone') ?? ''), email: String(form.get('email') ?? ''), contact: String(form.get('contact') ?? '') };
    const result = editing?.id ? await supabase.from('customers').update(payload).eq('id', editing.id).select().maybeSingle() : await supabase.from('customers').insert(payload).select().maybeSingle();
    if (!result.error && result.data) { setCustomers((current) => editing?.id ? current.map((item) => item.id === editing.id ? { ...item, ...result.data } : item) : [...current, result.data as Customer]); setEditing(null); setToast(editing?.id ? 'Cliente atualizado.' : 'Cliente cadastrado.'); await onSaved(); }
  };
  const remove = async (customer: Customer) => { const result = await supabase.from('customers').delete().eq('id', customer.id); if (!result.error) setCustomers((current) => current.filter((item) => item.id !== customer.id)); };
  return <div className="fade-in"><PageHeader eyebrow="RELACIONAMENTO" title="Clientes" description="Sua carteira de clientes e observações de atendimento." action={<button className="button button-primary" onClick={() => setEditing({ id: '', name: '', document: '', address: '', observations: '', phone: '', email: '', vehicle_brand: null, vehicle_model: null, vehicle_plate: null, vehicle_year: null, vehicle_km: null })}><Plus size={17} /> Novo cliente</button>} /><div className="customer-grid">{customers.map((customer) => <div className="customer-card" key={customer.id}><div className="customer-avatar">{customer.name.slice(0, 2).toUpperCase()}</div><div><h3>{customer.name}</h3><p>{customer.document || 'Documento não informado'}</p></div><div className="customer-observation">{customer.observations || 'Sem observações cadastradas.'}</div><div className="customer-contact"><span>{customer.phone || 'Sem telefone'}</span><span>{customer.email || 'Sem e-mail'}</span></div><div className="customer-actions"><button className="button button-secondary small" onClick={() => setEditing(customer)}>Editar</button><button className="button button-negative small" onClick={() => void remove(customer)}>Excluir</button></div></div>)}</div>{customers.length === 0 && <EmptyState icon={<Users />} title="Nenhum cliente ainda" text="Cadastre seu primeiro cliente." action={() => setEditing({ id: '', name: '', document: '', address: '', observations: '', phone: '', email: '', vehicle_brand: null, vehicle_model: null, vehicle_plate: null, vehicle_year: null, vehicle_km: null })} actionLabel="Novo cliente" />}{editing && <div className="modal-backdrop"><form className="modal-card" onSubmit={save}><ModalHeader title={editing.id ? 'Editar cliente' : 'Novo cliente'} onClose={() => setEditing(null)} /><div className="form-grid"><label className="full">Nome / Razão Social<input name="name" required defaultValue={editing.name} /></label><label>CPF / CNPJ<input name="document" defaultValue={editing.document ?? ''} /></label><label>Telefone<input name="phone" defaultValue={editing.phone ?? ''} /></label><label>E-mail<input name="email" type="email" defaultValue={editing.email ?? ''} /></label><label className="full">Endereço<input name="address" defaultValue={editing.address ?? ''} /></label><label className="full">Contato<input name="contact" defaultValue={(editing as any).contact ?? ''} placeholder="Pessoa de contato, referência comercial..." /></label><label className="full">Observações<textarea name="observations" rows={3} defaultValue={editing.observations ?? ''} placeholder="Contato do responsável, condições especiais..." /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-primary"><Check size={16} /> Salvar cliente</button></div></form></div>}{toast && <div className="toast"><Check size={17} /> {toast}</div>}</div>;
}

function FinancePage({ budgets }: { budgets: Budget[] }) {
  const approved = budgets.filter((budget) => budget.status !== 'Em aberto' && budget.status !== 'Rejeitado');
  const exportCsv = () => {
    const rows = [['Descrição', 'Empresa', 'Vencimento', 'Status', 'Valor'], ...approved.map((budget) => [`${budget.code} · ${budget.vehicle_model ?? 'Serviço'}`, 'Grupo JP', formatDate(budget.valid_until), budget.status, Number(budget.total).toFixed(2).replace('.', ',')])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="fade-in"><PageHeader eyebrow="GESTÃO / FINANCEIRO" title="Financeiro" description="Receitas previstas e situação dos serviços aprovados." action={<button className="button button-secondary" onClick={exportCsv}><Printer size={16} /> Exportar relatório</button>} /><div className="finance-cards"><Metric title="Receita prevista" value={money(approved.reduce((sum, item) => sum + Number(item.total), 0))} trend="Neste período" icon={<CircleDollarSign size={20} />} /><Metric title="Recebido" value={money(approved.filter((item) => item.status === 'Concluído').reduce((sum, item) => sum + Number(item.total), 0))} trend="Concluídos" positive icon={<Check size={20} />} /><Metric title="A receber" value={money(approved.filter((item) => item.status !== 'Concluído').reduce((sum, item) => sum + Number(item.total), 0))} trend="Em aberto" warning icon={<CreditCard size={20} />} /></div><div className="table-panel"><div className="panel-heading"><div><h3>Lançamentos recentes</h3><p>Uma receita é criada automaticamente a cada OS aprovada.</p></div></div><div className="data-table"><div className="table-row table-head"><span>Descrição</span><span>Empresa</span><span>Vencimento</span><span>Status</span><span>Valor</span></div>{approved.map((budget) => <div className="table-row" key={budget.id}><span className="item-name"><span className="item-icon green"><CircleDollarSign size={16} /></span><strong>{budget.code} · {budget.vehicle_model}</strong></span><span>Grupo JP</span><span>{formatDate(budget.valid_until)}</span><span><StatusBadge status={budget.status === 'Concluído' ? 'Pago' : 'Pendente'} /></span><span><strong>{money(Number(budget.total))}</strong></span></div>)}</div></div></div>;
}

function SettingsPage({ companies, onCompaniesChange, preferences, onPreferencesChange }: { companies: Company[]; onCompaniesChange: (companies: Company[]) => void; preferences: Preferences | null; onPreferencesChange: (prefs: Preferences) => void }) {
  const [tab, setTab] = useState<'empresas' | 'usuarios' | 'notificacoes' | 'preferencias'>('empresas');
  const [editing, setEditing] = useState<Company | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const autopartsInput = useRef<HTMLInputElement>(null);
  const garagensInput = useRef<HTMLInputElement>(null);

  const saveCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const updated = { ...editing, name: String(form.get('name') ?? ''), legal_name: String(form.get('legal_name') ?? ''), cnpj: String(form.get('cnpj') ?? ''), address: String(form.get('address') ?? ''), phone: String(form.get('phone') ?? ''), email: String(form.get('email') ?? '') };
    const { error } = await supabase.from('companies').update({ name: updated.name, legal_name: updated.legal_name, cnpj: updated.cnpj, address: updated.address, phone: updated.phone, email: updated.email }).eq('id', updated.id);
    if (error) return;
    onCompaniesChange(companies.map((company) => company.id === updated.id ? updated : company));
    setEditing(null);
  };

  const saveLogo = (event: ChangeEvent<HTMLInputElement>, company: Company) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const logo = String(reader.result);
      const { error } = await supabase.from('companies').update({ logo_url: logo }).eq('id', company.id);
      if (error) return;
      onCompaniesChange(companies.map((item) => item.id === company.id ? { ...item, logo_url: logo } : item));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preferences) return;
    setSavingPrefs(true);
    const form = new FormData(event.currentTarget);
    const updated: Preferences = { ...preferences, low_stock_alerts: form.get('low_stock_alerts') === 'on', stale_budget_alerts: form.get('stale_budget_alerts') === 'on', stale_budget_days: Number(form.get('stale_budget_days') ?? 5), default_validity_days: Number(form.get('default_validity_days') ?? 7), default_payment_terms: String(form.get('default_payment_terms') ?? ''), default_notes: String(form.get('default_notes') ?? ''), language: String(form.get('language') ?? 'pt-BR') };
    const { error } = await supabase.from('workspace_preferences').update({ low_stock_alerts: updated.low_stock_alerts, stale_budget_alerts: updated.stale_budget_alerts, stale_budget_days: updated.stale_budget_days, default_validity_days: updated.default_validity_days, default_payment_terms: updated.default_payment_terms, default_notes: updated.default_notes, language: updated.language }).eq('id', 'default');
    if (!error) onPreferencesChange(updated);
    setSavingPrefs(false);
  };

  return <div className="fade-in"><PageHeader eyebrow="WORKSPACE / PREFERÊNCIAS" title="Configurações" description="Gerencie empresas, usuários, alertas inteligentes e padrões do sistema." /><div className="settings-layout"><div className="settings-menu"><button className={tab === 'empresas' ? 'selected' : ''} onClick={() => setTab('empresas')}><Building2 size={17} /> Empresas</button><button className={tab === 'usuarios' ? 'selected' : ''} onClick={() => setTab('usuarios')}><Users size={17} /> Usuários e Acesso</button><button className={tab === 'notificacoes' ? 'selected' : ''} onClick={() => setTab('notificacoes')}><Bell size={17} /> Notificações</button><button className={tab === 'preferencias' ? 'selected' : ''} onClick={() => setTab('preferencias')}><Settings size={17} /> Preferências</button></div><div className="settings-content">{tab === 'empresas' && <div className="panel"><div className="panel-heading"><div><h3>Empresas do grupo</h3><p>Edite os dados exibidos em orçamentos, OS e impressões.</p></div></div><div className="company-list">{companies.map((company) => <div className="company-row company-row-expanded" key={company.id}><div className="company-logo company-logo-preview">{company.logo_url ? <img src={company.logo_url} alt={`Logo ${company.name}`} /> : <Building2 size={21} />}</div><div className="company-info"><strong>{company.name}</strong><span>{company.legal_name}</span><small>{company.address} · {company.phone} · {company.email}</small><div className="company-actions"><button className="button button-secondary small" onClick={() => setEditing(company)}>Editar dados</button><button className="button button-secondary small" onClick={() => (company.slug === 'autoparts' ? autopartsInput.current : garagensInput.current)?.click()}>Enviar Logo</button><input ref={company.slug === 'autoparts' ? autopartsInput : garagensInput} className="hidden hidden-file-input" type="file" accept="image/*" onChange={(event) => saveLogo(event, company)} /></div></div><div className="company-logo-inline">{company.logo_url ? <img src={company.logo_url} alt={`Logo salva ${company.name}`} /> : <span>Sem logo</span>}</div></div>)}</div></div>}{tab === 'usuarios' && <UsersSettings />}{tab === 'notificacoes' && <form className="panel" onSubmit={savePreferences}><div className="panel-heading"><div><h3>Alertas inteligentes</h3><p>Receba notificações automáticas no sino do cabeçalho.</p></div></div><div className="alert-list"><div className="alert-row"><div className="alert-info"><strong>Estoque baixo</strong><span>Alertar quando um item atingir a quantidade mínima.</span></div><label className="switch"><input type="checkbox" name="low_stock_alerts" defaultChecked={preferences?.low_stock_alerts ?? true} /><span className="switch-slider" /></label></div><div className="alert-row"><div className="alert-info"><strong>Orçamentos parados</strong><span>Alertar quando um orçamento ficar em aberto por mais de X dias.</span></div><label className="switch"><input type="checkbox" name="stale_budget_alerts" defaultChecked={preferences?.stale_budget_alerts ?? true} /><span className="switch-slider" /></label></div><div className="alert-row alert-row-inline"><label className="alert-field">Dias em aberto<input type="number" name="stale_budget_days" min="1" defaultValue={preferences?.stale_budget_days ?? 5} /></label></div></div><div className="modal-actions"><button className="button button-primary" disabled={savingPrefs}><Check size={16} /> {savingPrefs ? 'Salvando...' : 'Salvar alertas'}</button></div></form>}{tab === 'preferencias' && <form className="panel" onSubmit={savePreferences}><div className="panel-heading"><div><h3>Padrões de preenchimento</h3><p>Pré-preencha automaticamente cada novo orçamento.</p></div></div><div className="form-grid"><label>Validade padrão (dias)<input type="number" name="default_validity_days" min="1" defaultValue={preferences?.default_validity_days ?? 7} /></label><label>Idioma do sistema<select name="language" defaultValue={preferences?.language ?? 'pt-BR'}><option value="pt-BR">Português (Brasil)</option></select></label><label className="full">Condições de pagamento / entrega<textarea name="default_payment_terms" rows={2} defaultValue={preferences?.default_payment_terms ?? ''} placeholder="Ex.: Transferência bancária após entrega." /></label><label className="full">Observações padrão<textarea name="default_notes" rows={3} defaultValue={preferences?.default_notes ?? ''} placeholder="Ex.: Acréscimos ou descontos não previstos devem ser acordados entre as partes." /></label></div><div className="modal-actions"><button className="button button-primary" disabled={savingPrefs}><Check size={16} /> {savingPrefs ? 'Salvando...' : 'Salvar preferências'}</button></div></form>}</div></div>{editing && <div className="modal-backdrop"><form className="modal-card" onSubmit={saveCompany}><ModalHeader title={`Editar ${editing.name}`} onClose={() => setEditing(null)} /><div className="form-grid"><label>Nome<input name="name" defaultValue={editing.name} required /></label><label>Nome completo<input name="legal_name" defaultValue={editing.legal_name} required /></label><label>CNPJ<input name="cnpj" defaultValue={editing.cnpj ?? ''} placeholder="00.000.000/0000-00" /></label><label className="full">Endereço<input name="address" defaultValue={editing.address} required /></label><label>Telefone<input name="phone" defaultValue={editing.phone} required /></label><label>E-mail<input name="email" type="email" defaultValue={editing.email} required /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-primary"><Check size={16} /> Salvar alterações</button></div></form></div>}</div>;
}

function BudgetForm({ budget, companies, customers, inventory, selectedCompanyId, preferences, nextBudgetCode, onClose, onSaved }: { budget: Budget | null; companies: Company[]; customers: Customer[]; inventory: Inventory[]; selectedCompanyId: string; preferences: Preferences | null; nextBudgetCode: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [customerId, setCustomerId] = useState(budget?.customer_id ?? customers[0]?.id ?? '');
  const [companyId, setCompanyId] = useState(budget?.company_id ?? selectedCompanyId);
  const [items, setItems] = useState<BudgetItem[]>(budget?.items?.length ? budget.items : [{ description: '', quantity: 1, unit: 'un', unit_price: 0, subtotal: 0 }]);
  const [saving, setSaving] = useState(false);
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const customer = customers.find((item) => item.id === customerId);
  const addItem = () => setItems([...items, { description: '', quantity: 1, unit: 'un', unit_price: 0, subtotal: 0 }]);
  const removeItem = (index: number) => setItems(items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : [{ description: '', quantity: 1, unit: 'un', unit_price: 0, subtotal: 0 }]);
  const updateItem = (index: number, key: 'description' | 'quantity' | 'unit_price', value: string) => setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'description' ? value : Number(value), unit: item.unit || 'un', subtotal: key === 'description' ? item.subtotal : Number(value) * (key === 'quantity' ? item.unit_price : item.quantity) } : item));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const code = budget?.code ?? `OR.${String(Date.now()).slice(-4)}`;
    const payload = { company_id: companyId, customer_id: customerId || null, code: String(form.get('code') ?? code), status: budget?.status ?? 'Em aberto', budget_date: form.get('budget_date'), valid_until: form.get('valid_until'), vehicle_brand: form.get('vehicle_brand'), vehicle_model: form.get('vehicle_model'), vehicle_plate: form.get('vehicle_plate'), vehicle_year: form.get('vehicle_year'), vehicle_km: Number(form.get('vehicle_km')) || null, description: form.get('description'), payment_method: form.get('payment_method'), execution_deadline: form.get('execution_deadline'), notes: form.get('notes'), total };
    const result = budget ? await supabase.from('budgets').update(payload).eq('id', budget.id).select().maybeSingle() : await supabase.from('budgets').insert(payload).select().maybeSingle();
    if (!result.error && result.data) {
      if (budget) await supabase.from('budget_items').delete().eq('budget_id', budget.id);
      const validItems = items.filter((item) => item.description.trim());
      if (validItems.length) await supabase.from('budget_items').insert(validItems.map((item) => ({ budget_id: result.data.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.quantity * item.unit_price })));
      await onSaved();
    }
    setSaving(false);
  };
  return <div className="modal-backdrop form-backdrop"><form className="budget-form" onSubmit={save}><div className="form-topbar"><div><div className="eyebrow">{budget ? 'EDITAR DOCUMENTO' : 'NOVO DOCUMENTO'}</div><h2>{budget ? `Editar ${budget.code}` : 'Novo orçamento'}</h2><p>Preencha os dados para gerar uma proposta profissional.</p></div><button type="button" className="close-button" onClick={onClose}><X size={20} /></button></div><div className="form-company"><div className="company-logo">{companies.find((company) => company.id === companyId)?.logo_url ? <img src={companies.find((company) => company.id === companyId)?.logo_url ?? ''} alt="Logo da empresa" /> : <Building2 size={22} />}</div><div><strong>{companies.find((company) => company.id === companyId)?.name ?? 'Empresa'}</strong><span>{companies.find((company) => company.id === companyId)?.address}</span></div><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div><div className="form-section"><SectionTitle number="01" title="Dados do orçamento" /><div className="form-grid"><label>Número<input name="code" defaultValue={budget?.code ?? nextBudgetCode} placeholder="OR.0001" required /></label><label>Data<input name="budget_date" type="date" defaultValue={budget?.budget_date ?? new Date().toISOString().slice(0, 10)} required /></label><label>Validade<input name="valid_until" type="date" defaultValue={budget?.valid_until ?? new Date(Date.now() + (preferences?.default_validity_days ?? 7) * 86400000).toISOString().slice(0, 10)} /></label></div><div className="subheading"><Car size={16} /> Veículo</div><div className="form-grid four"><label>Marca<input name="vehicle_brand" defaultValue={budget?.vehicle_brand ?? customer?.vehicle_brand ?? ''} placeholder="Volkswagen" /></label><label>Modelo<input name="vehicle_model" defaultValue={budget?.vehicle_model ?? customer?.vehicle_model ?? ''} placeholder="T-Cross" /></label><label>Placa<input name="vehicle_plate" defaultValue={budget?.vehicle_plate ?? customer?.vehicle_plate ?? ''} placeholder="ABC1D23" /></label><label>Ano / KM<input name="vehicle_year" defaultValue={budget?.vehicle_year ?? customer?.vehicle_year ?? ''} placeholder="2023" /></label></div></div><div className="form-section"><SectionTitle number="02" title="Dados do cliente" /><div className="form-grid"><label className="full">Cliente cadastrado<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecionar cliente</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>CPF / CNPJ<input defaultValue={customer?.document ?? ''} placeholder="00.000.000/0000-00" /></label><label>Telefone<input defaultValue={customer?.phone ?? ''} placeholder="(11) 00000-0000" /></label><label className="full">E-mail<input defaultValue={customer?.email ?? ''} placeholder="cliente@email.com" /></label></div></div><div className="form-section"><SectionTitle number="03" title="Relatório inicial" /><label><span className="sr-only">Descrição das atividades</span><textarea name="description" rows={3} defaultValue={budget?.description ?? ''} placeholder="Descreva o diagnóstico, serviços e observações iniciais..." /></label></div><div className="form-section"><SectionTitle number="04" title="Itens e preços" /><div className="line-items">{items.map((item, index) => <div className="line-item" key={index}><select value={inventory.find((stockItem) => stockItem.name === item.description)?.name ? item.description : ''} onChange={(event) => { const selected = inventory.find((stockItem) => stockItem.name === event.target.value); if (selected) { setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, description: selected.name, unit_price: Number(selected.sale_price) } : current)); } }}><option value="">Escolher do estoque</option>{inventory.map((stockItem) => <option key={stockItem.id} value={stockItem.name}>{stockItem.name}</option>)}</select><input placeholder="Descrição do serviço ou item" value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} /><input type="number" min="1" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} /><strong>{money(item.quantity * item.unit_price)}</strong><button type="button" className="remove-line" title="Excluir linha" onClick={() => removeItem(index)}><Trash2 size={15} /></button></div>)}</div><button type="button" className="add-line" onClick={addItem}><Plus size={15} /> Adicionar item</button><div className="total-box"><span>Total geral</span><strong>{money(total)}</strong></div></div><div className="form-section"><SectionTitle number="05" title="Pagamento e condições" /><div className="form-grid"><label>Forma de pagamento<select name="payment_method"><option selected={budget?.payment_method === 'Pix'}>Pix</option><option selected={budget?.payment_method === 'Crédito'}>Crédito</option><option>Débito</option><option>Dinheiro</option><option>Transferência</option></select></label><label>Prazo de execução<input name="execution_deadline" placeholder="Ex.: 15 dias úteis" /></label><label className="full">Observações<textarea name="notes" rows={2} defaultValue={budget?.notes ?? [preferences?.default_payment_terms, preferences?.default_notes].filter(Boolean).join('\n\n')} placeholder="Condições de entrega, garantia e observações..." /></label></div></div><div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar orçamento'} <ArrowUpRight size={16} /></button></div></form></div>;
}

function BudgetPreview({ budget, company, onClose, onEdit, onStatus, onApprove }: { budget: Budget; company?: Company; onClose: () => void; onEdit: () => void; onStatus: (status: string) => Promise<void>; onApprove: () => void }) {
  return <div className="modal-backdrop"><div className="preview-modal"><div className="preview-actions"><button className="button button-secondary" onClick={onClose}>Voltar</button><div><button className="button button-secondary" onClick={onEdit}><Settings size={16} /> Editar</button><select className="status-select" value={budget.status} onChange={(event) => onStatus(event.target.value)}>{statuses.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select><button className="button button-secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button>{budget.status !== 'Rejeitado' && <button className="button button-negative" onClick={() => onStatus('Rejeitado')}><X size={16} /> Reprovar</button>}{budget.status !== 'Execução' && budget.status !== 'Concluído' && <button className="button button-primary" onClick={onApprove}><Check size={16} /> Aprovar e gerar OS</button>}</div></div><div className="document-preview"><div className="document-head"><div className="company-logo large">{company?.logo_url ? <img src={company.logo_url} alt={`Logo ${company.name}`} /> : <Building2 size={28} />}</div><div><strong>{company?.legal_name ?? 'Grupo JP'}</strong><span>{company?.address}</span><span>{company?.phone} · {company?.email}</span></div><div className="document-code"><span>ORÇAMENTO</span><strong>{budget.code}</strong><small>{formatDate(budget.budget_date)}</small></div></div><div className="document-title"><span>Proposta comercial</span><h1>{budget.vehicle_model || 'Serviço automotivo'}</h1><strong>{budget.vehicle_plate || 'SEM PLACA'}</strong></div><div className="document-client"><div><span>CLIENTE</span><strong>{budget.customers?.name || 'Cliente'}</strong><small>{budget.customers?.document || ''}</small><small>{budget.customers?.address || ''}</small><small>{budget.customers?.phone || ''} {budget.customers?.email || ''}</small></div><div><span>VEÍCULO</span><strong>{budget.vehicle_brand} {budget.vehicle_model} · {budget.vehicle_year || 'Ano não informado'}</strong><small>{budget.vehicle_plate || 'Sem placa'} · {budget.vehicle_km ? `${budget.vehicle_km.toLocaleString('pt-BR')} KM` : 'KM não informado'}</small></div><div><span>VALIDADE</span><strong>{formatDate(budget.valid_until)}</strong></div></div><div className="document-section"><h3>Descrição das atividades</h3><p>{budget.description || 'Serviços automotivos conforme avaliação técnica.'}</p></div><div className="document-section"><h3>Itens e serviços</h3><div className="document-items"><div><span>Descrição</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span></div>{(budget.items ?? []).map((item) => <div key={item.id ?? item.description}><strong>{item.description}</strong><span>{item.quantity} {item.unit}</span><span>{money(Number(item.unit_price))}</span><strong>{money(Number(item.subtotal || item.quantity * item.unit_price))}</strong></div>)}{!(budget.items ?? []).length && <p>Nenhum item discriminado neste orçamento.</p>}</div></div><div className="document-section"><h3>Resumo financeiro</h3><div className="document-total"><span>Valor total da proposta</span><strong>{money(Number(budget.total))}</strong></div></div><div className="document-terms"><div><span>Pagamento</span><strong>{budget.payment_method || 'A combinar'}</strong></div><div><span>Condições</span><strong>Orçamento válido conforme data acima</strong></div></div><div className="signature-grid"><div>Assinatura da empresa</div><div>Assinatura do cliente</div></div></div></div></div>;
}

export default App;
