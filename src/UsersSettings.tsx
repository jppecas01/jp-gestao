import { FormEvent, useEffect, useState } from 'react';
import { Check, Plus, Shield, Trash2 } from 'lucide-react';
import { AppUser } from './types';
import { deleteUser, listUsers, saveUser } from './auth';
import { ModalHeader } from './components';

export function UsersSettings() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editing, setEditing] = useState<Partial<AppUser> | null>(null);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);

  const load = async () => { setUsers(await listUsers()); };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); } }, [toast]);

  const doSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      id: editing.id,
      email: String(form.get('email') ?? ''),
      name: String(form.get('name') ?? ''),
      password: String(form.get('password') ?? '') || undefined,
      role: String(form.get('role') ?? 'admin'),
      active: form.get('active') === 'on',
    };
    const result = await saveUser(payload);
    if (result.success) { setEditing(null); setToast('Usuário salvo.'); await load(); }
    else setToast(result.error ?? 'Erro ao salvar.');
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteUser(confirmDelete.id);
    if (result.success) { setConfirmDelete(null); setToast('Usuário removido.'); await load(); }
    else setToast(result.error ?? 'Erro ao remover.');
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div><h3>Usuários e Acesso</h3><p>Gerencie os membros autorizados a acessar o sistema.</p></div>
        <button className="button button-primary small" onClick={() => setEditing({ email: '', name: '', password: '', role: 'admin', active: true })}><Plus size={15} /> Novo usuário</button>
      </div>
      <div className="users-list">
        {users.map((u) => (
          <div className="user-row" key={u.id}>
            <div className="user-avatar-lg">{u.name.slice(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <strong>{u.name}</strong>
              <span>{u.email}</span>
              <small>Perfil: {u.role === 'admin' ? 'Administrador' : u.role} · {u.active ? 'Ativo' : 'Inativo'}</small>
            </div>
            <div className="user-actions">
              <button className="button button-secondary small" onClick={() => setEditing({ ...u, password: '' })}>Editar</button>
              <button className="button button-negative small" onClick={() => setConfirmDelete(u)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="empty-inline">Nenhum usuário cadastrado.</div>}
      </div>

      <div className="default-access-card">
        <Shield size={18} />
        <div>
          <strong>Acesso inicial padrão</strong>
          <span>Use estas credenciais no primeiro acesso. Altere a senha após entrar.</span>
          <small>Usuário: <b>admin@jpgaragens.com</b> · Senha: <b>admin123</b></small>
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={doSave}>
            <ModalHeader title={editing.id ? 'Editar usuário' : 'Novo usuário'} onClose={() => setEditing(null)} />
            <div className="form-grid">
              <label className="full">Nome completo<input name="name" required defaultValue={editing.name ?? ''} placeholder="Nome do membro" /></label>
              <label className="full">E-mail / Usuário<input name="email" type="email" required defaultValue={editing.email ?? ''} placeholder="usuario@jpgaragens.com" /></label>
              <label>Senha<input name="password" type="password" defaultValue="" placeholder={editing.id ? 'Deixe vazio para manter' : 'Defina a senha'} required={!editing.id} /></label>
              <label>Perfil<select name="role" defaultValue={editing.role ?? 'admin'}><option value="admin">Administrador</option><option value="membro">Membro</option></select></label>
              <label className="checkbox-label"><input type="checkbox" name="active" defaultChecked={editing.active ?? true} /> Usuário ativo</label>
            </div>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="button button-primary"><Check size={16} /> Salvar usuário</button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-card">
            <div className="confirm-icon"><Trash2 size={22} /></div>
            <h2>Remover usuário?</h2>
            <p>O usuário <strong>{confirmDelete.name}</strong> ({confirmDelete.email}) não poderá mais acessar o sistema.</p>
            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="button button-negative" onClick={() => void doDelete()}><Trash2 size={16} /> Remover</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  );
}
