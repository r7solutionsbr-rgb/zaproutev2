import React from 'react';
import { CheckCircle } from 'lucide-react';
import { TenantConfig } from '../../types';

interface IntegrationSettingsProps {
    config: TenantConfig;
    updateNestedConfig: (section: keyof TenantConfig, key: string, value: any) => void;
}

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({ config, updateNestedConfig }) => {
    return (
        <div className="space-y-6">
            {/* Provider Selection */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Provedor de Mensagens</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => updateNestedConfig('whatsappProvider', 'type', 'ZAPI')}
                        className={`p-6 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${config.whatsappProvider?.type === 'ZAPI'
                            ? 'border-green-500 bg-green-50'
                            : 'border-slate-100 hover:border-slate-300'
                            }`}
                    >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">Z</div>
                        <div>
                            <div className="font-bold text-slate-800">Z-API</div>
                            <div className="text-xs text-slate-500">Conexão via QR Code. Simples e direto.</div>
                        </div>
                        {config.whatsappProvider?.type === 'ZAPI' && <CheckCircle className="ml-auto text-green-600" />}
                    </button>

                    <button
                        onClick={() => updateNestedConfig('whatsappProvider', 'type', 'SENDPULSE')}
                        className={`p-6 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${config.whatsappProvider?.type === 'SENDPULSE'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-100 hover:border-slate-300'
                            }`}
                    >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">S</div>
                        <div>
                            <div className="font-bold text-slate-800">SendPulse</div>
                            <div className="text-xs text-slate-500">API Oficial. Requer aprovação de templates.</div>
                        </div>
                        {config.whatsappProvider?.type === 'SENDPULSE' && <CheckCircle className="ml-auto text-blue-600" />}
                    </button>
                </div>

                {/* Credentials removed as requested */}
            </div>

            {/* Templates - AGORA COM TODOS OS 4 CAMPOS */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Mensagens Automáticas</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        {/* WELCOME - NOVO */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                🎉 Boas-vindas (Cadastro)
                            </label>
                            <textarea
                                rows={4}
                                value={config.whatsappTemplates?.welcome || ''}
                                onChange={(e) => updateNestedConfig('whatsappTemplates', 'welcome', e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Olá {motorista}, seja bem-vindo à equipe!"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Enviada quando motorista é cadastrado. Variável: {'{motorista}'}
                            </p>
                        </div>

                        {/* GREETING */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                👋 Saudação Diária
                            </label>
                            <textarea
                                rows={4}
                                value={config.whatsappTemplates?.greeting || ''}
                                onChange={(e) => updateNestedConfig('whatsappTemplates', 'greeting', e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Olá {motorista}, sua rota está pronta..."
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Variáveis: {'{motorista}'}, {'{rota}'}, {'{entregas}'}
                            </p>
                        </div>

                        {/* SUCCESS */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                ✅ Sucesso na Entrega
                            </label>
                            <textarea
                                rows={4}
                                value={config.whatsappTemplates?.success || ''}
                                onChange={(e) => updateNestedConfig('whatsappTemplates', 'success', e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Entrega {nf} realizada com sucesso!"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Variáveis: {'{nf}'}, {'{cliente}'}, {'{motorista}'}
                            </p>
                        </div>

                        {/* FAILURE - NOVO */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                ⚠️ Falha na Entrega
                            </label>
                            <textarea
                                rows={4}
                                value={config.whatsappTemplates?.failure || ''}
                                onChange={(e) => updateNestedConfig('whatsappTemplates', 'failure', e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Ocorrência registrada na nota {nf}. Motivo: {motivo}"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Variáveis: {'{nf}'}, {'{cliente}'}, {'{motivo}'}
                            </p>
                        </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="bg-[#E5DDD5] p-6 rounded-xl border border-slate-200 relative overflow-hidden h-fit sticky top-4">
                        <div className="absolute top-0 left-0 w-full h-2 bg-black/10"></div>
                        <div className="flex flex-col gap-4">
                            <div className="self-start bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] relative">
                                <div className="text-xs font-bold text-[#075E54] mb-1">Bot ZapRoute</div>
                                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                                    {(config.whatsappTemplates?.greeting || 'Olá Motorista...')
                                        .replace('{motorista}', 'João Silva')
                                        .replace('{rota}', 'R-123')
                                        .replace('{entregas}', '15')}
                                </p>
                                <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                                    10:30 <CheckCircle size={10} className="text-blue-400" />
                                </div>
                            </div>

                            <div className="self-end bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                                <p className="text-sm text-slate-800">Entendido, iniciando rota!</p>
                                <div className="text-[10px] text-slate-500 text-right mt-1 flex items-center justify-end gap-1">
                                    10:31 <CheckCircle size={10} className="text-blue-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
