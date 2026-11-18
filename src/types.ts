export type Company = { id: string; slug: string; name: string; legal_name: string; cnpj?: string | null; address: string; phone: string; email: string; logo_url: string | null };
export type BudgetItem = { id?: string; budget_id?: string; description: string; quantity: number; unit: string; unit_price: number; subtotal: number };
export type Customer = { id: string; name: string; document: string | null; address?: string | null; observations?: string | null; phone: string | null; email: string | null; contact?: string | null; vehicle_brand: string | null; vehicle_model: string | null; vehicle_plate: string | null; vehicle_year: string | null; vehicle_km: number | null };
export type Budget = { id: string; company_id: string | null; customer_id: string | null; code: string; status: string; budget_date: string; valid_until: string | null; vehicle_brand: string | null; vehicle_model: string | null; vehicle_plate: string | null; vehicle_year: string | null; vehicle_km: number | null; description: string | null; payment_method: string | null; execution_deadline?: string | null; notes?: string | null; total: number; customers?: Customer | null; items?: BudgetItem[] };
export type Inventory = { id: string; company_id: string | null; name: string; category: string; unit: string; stock: number; minimum_stock: number; cost: number; sale_price: number; observations?: string | null };
export type WorkOrder = { id: string; code: string; stage: string; total: number; entry_date: string | null; vehicle: string; plate: string; customer: string; budget_id?: string | null };
export type Preferences = { id: string; low_stock_alerts: boolean; stale_budget_alerts: boolean; stale_budget_days: number; default_validity_days: number; default_payment_terms: string; default_notes: string; language: string };
export type AppUser = { id: string; email: string; name: string; password_hash: string; role: string; active: boolean; created_at: string };
export type WorkOrderStep = { id: string; work_order_id: string; stage: string; professional: string | null; minutes_worked: number; started_at: string | null; finished_at: string | null; created_at: string };
export type MaterialWithdrawal = { id: string; work_order_id: string; inventory_item_id: string | null; professional: string | null; stage: string | null; product_name: string; quantity: number; unit_cost: number; withdrawn_at: string; created_at: string };
export type WorkOrderPhoto = { id: string; work_order_id: string; stage: string; photo_url: string; caption: string | null; taken_at: string; created_at: string };
export type Quote = { id: string; company: string; supplier_name: string; quote_date: string; product: string; quantity: number; unit_price: number; total_price: number; observations: string | null; created_at: string };

export type View = 'dashboard' | 'budgets' | 'orders' | 'inventory' | 'quotes' | 'customers' | 'finance' | 'settings';

export const stages = ['Aguardando entrada', 'Funilaria / Preparação', 'Pintura', 'Montagem', 'Pronto', 'Entregue'];
export const prontuarioStages = ['Chegada', 'Funilaria', 'Pintura', 'Entrega'];
export const serviceSteps = ['Funilaria/Preparação', 'Pintura', 'Montagem', 'Acabamento'];
export const statuses = ['Todos', 'Em aberto', 'Aceito', 'Rejeitado', 'Revisar', 'Execução', 'Concluído'];

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
export const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`)) : '—';
export const formatDateTime = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

export function hashPassword(password: string): string {
  return `jp$${password}`;
}
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
