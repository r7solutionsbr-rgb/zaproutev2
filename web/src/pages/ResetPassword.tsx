import React, { useState } from 'react';
import { api } from '../services/api';
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        setStatus('ERROR');
        setMessage('As senhas não coincidem.');
        return;
    }

    if (!token) {
        setStatus('ERROR');
        setMessage('Token de recuperação inválido ou ausente.');
        return;
    }

    setStatus('LOADING');
    try {
      await api.auth.resetPassword(token, password);
      setStatus('SUCCESS');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setStatus('ERROR');
      setMessage(error.response?.data?.message || 'Erro ao redefinir senha. O link pode ter expirado.');
    }
  };

  if (!token) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h1 className="text-xl font-bold">Link Inválido</h1>
                <p className="text-slate-400 mt-2">Este link de recuperação está quebrado ou incompleto.</p>
                <Link to="/login" className="mt-6 inline-block text-blue-400 hover:text-blue-300">Voltar ao Login</Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nova Senha</h1>
          <p className="text-slate-500 mt-2 text-sm">Crie uma nova senha segura para sua conta.</p>
        </div>

        {status === 'SUCCESS' ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center animate-in fade-in zoom-in">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-green-800 mb-2">Senha Alterada!</h3>
            <p className="text-green-700 text-sm">Você será redirecionado para o login em instantes...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
              <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="******"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Senha</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="******"
              />
            </div>

            {status === 'ERROR' && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={status === 'LOADING'}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === 'LOADING' ? <Loader2 className="animate-spin" /> : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};