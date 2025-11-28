import React, { useState } from 'react';
import { Search, MapPin, Copy, Eraser, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Componentes Auxiliares
const ResultItem = ({ label, value }: { label: string, value: string }) => (
  <div className="border-b border-slate-100 pb-2 last:border-0">
    <span className="block text-xs uppercase font-bold text-slate-400 mb-1">{label}</span>
    <span className="text-lg font-medium text-slate-800 block select-all">{value || '---'}</span>
  </div>
);

export const CepSearch: React.FC = () => {
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Máscara simples 00000-000
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
    setCep(value);
  };

  const handleSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setError('O CEP deve conter 8 dígitos.');
      setAddress(null);
      return;
    }

    setLoading(true);
    setError('');
    setAddress(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado.');
      } else {
        setAddress(data);
      }
    } catch (err) {
      setError('Erro ao buscar informações. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCep('');
    setAddress(null);
    setError('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="text-blue-600" size={32} />
          Consulta de CEP
        </h1>
        <p className="text-slate-500 mt-1">Busque o endereço completo informando apenas o CEP.</p>
      </div>

      {/* CARD DE BUSCA */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 mb-2">Digite o CEP</label>
            <div className="relative">
              <input
                type="text"
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-mono tracking-wider text-slate-700"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
          </div>
          
          <button
            onClick={handleSearch}
            disabled={loading || cep.length < 9}
            className={`px-6 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-colors h-[52px] ${
              loading || cep.length < 9 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            Buscar
          </button>

          {address && (
            <button
              onClick={handleClear}
              className="px-4 py-3 rounded-lg font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 flex items-center gap-2 h-[52px]"
              title="Limpar busca"
            >
              <Eraser size={20} />
            </button>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>

      {/* RESULTADOS */}
      {address && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} /> Resultado Encontrado
            </h3>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
              {address.cep}
            </span>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResultItem label="Logradouro" value={address.logradouro} />
            <ResultItem label="Bairro" value={address.bairro} />
            <ResultItem label="Cidade" value={address.localidade} />
            <ResultItem label="Estado (UF)" value={`${address.uf}`} />
            <ResultItem label="DDD" value={address.ddd} />
            <ResultItem label="Código IBGE" value={address.ibge} />
          </div>
          
          {address.complemento && (
            <div className="px-6 pb-6">
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 text-sm">
                    <strong>Complemento:</strong> {address.complemento}
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};