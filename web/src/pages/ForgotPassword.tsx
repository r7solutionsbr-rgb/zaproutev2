import React, { useState } from 'react';
import { api } from '../services/api';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    try {
      await api.auth.forgotPassword(email);
      setStatus('SUCCESS');
      setMessage('Se o e-mail estiver cadastrado, você receberá um link em instantes.');
    } catch (error) {
      setStatus('ERROR');
      setMessage('Ocorreu um erro ao tentar enviar o e-mail. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8">
        <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 text-sm font-bold transition-colors">
          <ArrowLeft size={16} /> Voltar para Login
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Recuperar Senha</h1>
          <p className="text-slate-500 mt-2 text-sm">Informe seu e-mail para receber as instruções.</p>
        </div>

        {status === 'SUCCESS' ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center animate-in fade-in zoom-in">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-green-800 mb-2">E-mail Enviado!</h3>
            <p className="text-green-700 text-sm">{message}</p>
            <Link to="/login" className="block mt-6 w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
              Voltar ao Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Cadastrado</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="nome@empresa.com"
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
              {status === 'LOADING' ? <Loader2 className="animate-spin" /> : 'Enviar Link de Recuperação'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};