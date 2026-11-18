import { FormEvent, useState } from 'react';
import { Gauge, Lock, Mail, X } from 'lucide-react';
import { loginWithCredentials } from './auth';

export function LoginScreen({ onSuccess }: { onSuccess: (user: { id: string; email: string; name: string; role: string }) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginWithCredentials(email, password);
    setLoading(false);
    if (result.success && result.user) onSuccess(result.user);
    else setError(result.error ?? 'Erro ao entrar.');
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark"><Gauge size={24} /></div>
          <div><strong>JP Gestão</strong><span>Operação inteligente</span></div>
        </div>
        <div className="login-body">
          <h2>Bem-vindo de volta</h2>
          <p>Entre com suas credenciais para acessar o sistema.</p>
          <form onSubmit={submit} className="login-form">
            <label>
              <span>E-mail / Usuário</span>
              <div className="login-input-wrapper">
                <Mail size={17} />
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@jpgaragens.com" required autoComplete="email" />
              </div>
            </label>
            <label>
              <span>Senha</span>
              <div className="login-input-wrapper">
                <Lock size={17} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              </div>
            </label>
            {error && <div className="login-error"><X size={15} /> {error}</div>}
            <button className="button button-primary login-submit" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="login-hint">
              <strong>Acesso inicial padrão</strong>
              <span>Usuário: admin@jpgaragens.com</span>
              <span>Senha: admin123</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
