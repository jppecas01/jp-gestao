import { supabase } from '@/lib/supabase';
import { AppUser, hashPassword, verifyPassword } from './types';

const SESSION_KEY = 'jp-session-user';

export function getSessionUser(): { id: string; email: string; name: string; role: string } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSessionUser(user: { id: string; email: string; name: string; role: string }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  localStorage.removeItem(SESSION_KEY);
}

export async function fetchUserByEmail(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export async function loginWithCredentials(email: string, password: string): Promise<{ success: boolean; error?: string; user?: { id: string; email: string; name: string; role: string } }> {
  const user = await fetchUserByEmail(email.trim());
  if (!user) return { success: false, error: 'Usuário não encontrado.' };
  if (!user.active) return { success: false, error: 'Usuário inativo. Contate o administrador.' };
  if (!verifyPassword(password, user.password_hash)) return { success: false, error: 'Senha incorreta.' };
  const session = { id: user.id, email: user.email, name: user.name, role: user.role };
  setSessionUser(session);
  return { success: true, user: session };
}

export async function saveUser(user: Partial<AppUser> & { email: string; name: string; password?: string }): Promise<{ success: boolean; error?: string }> {
  const password_hash = user.password ? hashPassword(user.password) : user.password_hash ?? 'jp$';
  const payload = { email: user.email, name: user.name, password_hash, role: user.role ?? 'admin', active: user.active ?? true };
  if (user.id) {
    const update: Record<string, unknown> = { email: payload.email, name: payload.name, role: payload.role, active: payload.active };
    if (user.password) update.password_hash = payload.password_hash;
    const { error } = await supabase.from('app_users').update(update).eq('id', user.id);
    return error ? { success: false, error: error.message } : { success: true };
  }
  const { error } = await supabase.from('app_users').insert(payload);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as AppUser[];
}
